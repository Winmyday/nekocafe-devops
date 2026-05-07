/**
 * NekoCafe 会员服务 - Express入口
 * 班级：计算机233  姓名：刘俞靖  学号：231002501
 */
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Structured JSON logging
const logger = {
  info: (msg, extra = {}) => console.log(JSON.stringify({
    time: new Date().toISOString(),
    level: 'INFO',
    service: 'member',
    message: msg,
    ...extra
  })),
  error: (msg, extra = {}) => console.error(JSON.stringify({
    time: new Date().toISOString(),
    level: 'ERROR',
    service: 'member',
    message: msg,
    ...extra
  }))
};

// In-memory store
const users = {};
const members = {};
const tokens = {};

// ===== Health Check =====
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', service: 'member', version: '1.0.0' });
});

// ===== Auth =====
app.post('/api/v1/auth/register', (req, res) => {
  const { phone, code, nickname } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ error: '手机号和验证码为必填项' });
  }

  const userId = crypto.randomUUID();
  const accessToken = crypto.randomBytes(32).toString('hex');
  const refreshToken = crypto.randomBytes(32).toString('hex');

  users[userId] = {
    user_id: userId,
    phone: maskPhone(phone),
    nickname: nickname || '猫咪爱好者',
    created_at: new Date().toISOString()
  };

  members[userId] = {
    user_id: userId,
    level: '普通',
    points: 0,
    total_spent: 0,
    visit_count: 0
  };

  tokens[accessToken] = { user_id: userId, expires_at: Date.now() + 7200000 };

  logger.info('User registered', { user_id: userId, phone: maskPhone(phone) });

  res.status(201).json({
    user_id: userId,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 7200
  });
});

app.post('/api/v1/auth/login', (req, res) => {
  const { phone } = req.body;
  const userEntry = Object.values(users).find(u => u.phone === maskPhone(phone));

  if (!userEntry) {
    return res.status(401).json({ error: '用户不存在' });
  }

  const accessToken = crypto.randomBytes(32).toString('hex');
  tokens[accessToken] = { user_id: userEntry.user_id, expires_at: Date.now() + 7200000 };

  logger.info('User logged in', { user_id: userEntry.user_id });

  res.json({
    access_token: accessToken,
    refresh_token: crypto.randomBytes(32).toString('hex'),
    expires_in: 7200
  });
});

// ===== Member Profile =====
app.get('/api/v1/members/:userId', (req, res) => {
  const user = users[req.params.userId];
  const member = members[req.params.userId];

  if (!user || !member) {
    return res.status(404).json({ error: '用户不存在' });
  }

  res.json({
    user_id: user.user_id,
    nickname: user.nickname,
    phone: user.phone,
    level: member.level,
    points: member.points,
    total_spent: member.total_spent,
    visit_count: member.visit_count,
    created_at: user.created_at
  });
});

// ===== Points =====
app.get('/api/v1/members/:userId/points', (req, res) => {
  const member = members[req.params.userId];
  if (!member) {
    return res.status(404).json({ error: '会员不存在' });
  }
  res.json({
    total_points: member.points,
    available_points: member.points,
    history: []
  });
});

// ===== Preferences =====
app.get('/api/v1/members/:userId/preferences', (req, res) => {
  const user = users[req.params.userId];
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  res.json(user.preferences || {
    favorite_categories: [],
    favorite_cat_breeds: [],
    dietary_restrictions: [],
    price_range: '不限',
    seat_preference: '不限'
  });
});

// ===== Helpers =====
function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone;
  return phone.substring(0, 3) + '****' + phone.substring(7);
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  logger.info(`Member service starting on port ${PORT}`);
});