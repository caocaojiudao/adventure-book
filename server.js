const express = require('express')
const session = require('express-session')
const bodyParser = require('body-parser')
const helmet = require('helmet')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
const pgSession = require('connect-pg-simple')(session)
const { Pool } = require('pg')
const { prisma } = require('./models/models')
const apiStory = require('./api/story')
const apiUser = require('./api/user')

const app = express()

// Trust the first proxy (Render's load balancer) so Express sees the
// correct protocol for secure cookie handling
app.set('trust proxy', 1)

// Security headers — CSP is disabled here because styled-components requires
// inline styles and the app loads fonts from Google. Configure a proper CSP
// once a nonce-based approach or a CDN for assets is in place.
app.use(helmet({ contentSecurityPolicy: false }))

// Compress all responses
app.use(compression())

app.use(express.static('public'))

// Rate-limit authentication endpoints to slow brute-force attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 20,
  message: { success: false, reason: 'Too many requests, please try again later.' }
})
app.use('/api/login', authLimiter)
app.use('/api/signup', authLimiter)

// Persistent session storage backed by Postgres.
// The session table is created automatically on first run.
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL })

app.use(session({
  secret: process.env.SESSION_SECRET || 'blippity-bloppity',
  resave: false,
  saveUninitialized: false,
  store: new pgSession({
    pool: pgPool,
    createTableIfMissing: true,
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
  }
}))

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.post('/api/story', (req, res) => {
  if (!req.session.user) {
    return res.status(401).send({ success: false, reason: 'Not authenticated' })
  }
  const story = req.body.story
  prisma.story.findFirst({ where: { title: story.title, author: story.author } })
    .then(existing => {
      if (existing) {
        return res.send({ success: false, reason: 'A story with this name already exists' })
      }
      return prisma.story.create({ data: story })
        .then(() => res.send({ success: true }))
    })
    .catch(err => {
      res.send({ success: false, reason: err.message })
    })
})

app.put('/api/story', (req, res) => {
  if (!req.session.user) {
    return res.status(401).send({ success: false, reason: 'Not authenticated' })
  }
  const { content, title, category, description, id } = req.body
  prisma.story.findUnique({ where: { id: parseInt(id, 10) } })
    .then(story => {
      if (!story) {
        return res.send({ success: false, reason: 'Story not found' })
      }
      if (story.author !== req.session.user.username) {
        return res.status(403).send({ success: false, reason: 'Not authorized' })
      }
      return prisma.story.update({ where: { id: story.id }, data: { content, title, category, description } })
        .then(() => res.send({ success: true }))
    })
    .catch(err => {
      res.send({ success: false, reason: err.message })
    })
})

apiStory(app)
apiUser(app)

// Catch-all error handler — prevents unhandled exceptions from crashing the process
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send({ success: false, reason: 'Internal server error' })
})

const PORT = process.env.PORT || 8080

app.listen(PORT)
console.log(`Listening on port ${PORT}`)
