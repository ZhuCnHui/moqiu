const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// 静态文件目录（学生端和教师端网页）
app.use(express.static('public'));

// 存储所有小组的统计数据
const groupStats = {};

// ===== Socket.io 事件处理 =====
io.on('connection', (socket) => {
  console.log('新客户端连接:', socket.id);

  // 学生端注册小组
  socket.on('registerGroup', (groupId) => {
    socket.groupId = groupId;
    if (!groupStats[groupId]) {
      groupStats[groupId] = {
        id: groupId,
        total: 0,
        red: 0,
        green: 0,
        yellow: 0,
        records: []
      };
    }
    console.log(`小组 ${groupId} 已注册`);
    // 发送当前统计数据给该小组
    socket.emit('initStats', groupStats[groupId]);
  });

  // 接收摸球记录
  socket.on('record', (data) => {
    const { groupId, color } = data;
    if (!groupStats[groupId]) {
      groupStats[groupId] = {
        id: groupId,
        total: 0,
        red: 0,
        green: 0,
        yellow: 0,
        records: []
      };
    }
    const stats = groupStats[groupId];
    stats.total++;
    if (color === 'red') stats.red++;
    else if (color === 'green') stats.green++;
    else if (color === 'yellow') stats.yellow++;
    stats.records.push({ color, time: new Date().toLocaleTimeString() });

    // 广播给所有教师端
    io.emit('statsUpdate', groupStats);
    // 单独发给该小组确认
    socket.emit('recordConfirmed', { groupId, color, total: stats.total });
  });

  // 教师端请求所有数据
  socket.on('teacherRequest', () => {
    socket.emit('statsUpdate', groupStats);
  });

  // 教师端清空某个小组的数据
  socket.on('clearGroup', (groupId) => {
    if (groupStats[groupId]) {
      groupStats[groupId] = {
        id: groupId,
        total: 0,
        red: 0,
        green: 0,
        yellow: 0,
        records: []
      };
      io.emit('statsUpdate', groupStats);
    }
  });

  // 教师端清空所有数据
  socket.on('clearAll', () => {
    for (let key in groupStats) {
      groupStats[key] = {
        id: key,
        total: 0,
        red: 0,
        green: 0,
        yellow: 0,
        records: []
      };
    }
    io.emit('statsUpdate', groupStats);
  });

  socket.on('disconnect', () => {
    console.log('客户端断开:', socket.id);
  });
});

// ===== 启动服务器 =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 服务器运行在 http://localhost:${PORT}`);
  console.log(`📱 学生端: http://localhost:${PORT}/student.html`);
  console.log(`👨‍🏫 教师端: http://localhost:${PORT}/teacher.html`);
});