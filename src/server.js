// express, http, ws를 import
import http from "http";
// import WebSocket from "ws";
import { Server } from "socket.io";
import express from "express";
import { instrument } from "@socket.io/admin-ui";
import { parse } from "path";
// express 어플리케이션을 구성
const app = express();
// view engine을 pug로 설정
app.set("view engine", "pug");
// views 디렉토리 설정
app.set("views", __dirname + "/views");
// public 디렉토리 설정 (이 폴더를 유저들에게 공개)
// 보안상의 이유로 유저가 모든 폴더를 볼 수 없고, 지정해 둔 폴더만 가능
app.use("/public", express.static(__dirname + "/public"));
// 홈페이지로 이동 시 사용될 템플릿을 렌더링
app.get("/", (req, res) => res.render("home"));
// catchall url
// 유저가 어떤 url로 이동하던지 홈으로 돌려보냄
app.get("/*", (req, res) => res.redirect("/"));

const handleListen = () => console.log(`Listening on http://localhost:3000`);
// app.listen(3000, handleListen);

const httpServer = http.createServer(app);
const wsServer = new Server(httpServer, {
    cors: {
        origin: ["https://admin.socket.io"],
        credentials: true
    }
});
instrument(wsServer, {
    auth: false
});

function publicRooms() {
    const { sockets: { adapter: { sids, rooms }, }, } = wsServer;
    // 위 문장과 같은 코드
    // const sids = wsServer.sockets.adapter.sids;
    // const rooms = wsServer.sockets.adapter.rooms;
    const publicRooms = [];
    rooms.forEach((_, key) => {
        if (sids.get(key) === undefined) {
            publicRooms.push(key);
        }
    });
    return publicRooms;
}

function countRoom(roomName) {
    return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}

wsServer.on("connection", (socket) => {
    socket["nickname"] = "Anon";
    console.log(wsServer.sockets.adapter);
    socket.onAny((event) => {
        console.log(`Socket Event: ${event}`);
    });

    socket.on("enter_room", (roomName, done) => {
        socket.join(roomName);
        done();
        socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
        wsServer.sockets.emit("room_change", publicRooms());
    });

    socket.on("disconnecting", () => {
        socket.rooms.forEach((room) => socket.to(room).emit("bye", socket.nickname, countRoom(room) - 1));
    });

    socket.on("disconnect", () => {
        wsServer.sockets.emit("room_change", publicRooms());
    });

    socket.on("new_message", (msg, room, done) => {
        socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`);
        done();
    });

    socket.on("nickname", (nickname) => (socket["nickname"] = nickname));
});

httpServer.listen(3000, handleListen);



// const wss = new WebSocket.Server({ server });

// const sockets = [];

// wss.on("connection", (socket) => {
//     sockets.push(socket);
//     socket["nickname"] = "Anonymous";
//     console.log("Connected to Browser ⭕ ");
//     socket.on("close", () =>
//         console.log("Disconnected from the Browser ❌"))
//     socket.on("message", (msg) => {
//         const message = JSON.parse(msg);
//         switch (message.type) {
//             case "new_message":
//                 sockets.forEach((aSocket) =>
//                     aSocket.send(`${socket.nickname}: ${message.payload}`));
//                 break;
//             case "nickname":
//                 socket["nickname"] = message.payload;
//                 break;
//         }
//     });
// });
