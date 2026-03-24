const { prisma } = require('../models/models.js')

module.exports = app => {
  app.get('/api/stories/', (req, res) => {
    prisma.story.findMany({ where: { published: true } })
      .then(stories => {
        res.send({ success: true, stories })
      })
      .catch(err => {
        res.send({ success: false, reason: err.message })
      })
  })

  app.get('/api/stories/:author', (req, res) => {
    const { author } = req.params
    const isOwner = req.session.user && author === req.session.user.username
    const where = isOwner ? { author } : { author, published: true }
    prisma.story.findMany({ where })
      .then(stories => {
        res.send({ success: true, stories })
      })
      .catch(err => {
        res.send({ success: false, reason: err.message })
      })
  })

  app.get('/api/story/:id', (req, res) => {
    const id = parseInt(req.params.id, 10)
    prisma.story.findUnique({ where: { id } })
      .then(story => {
        res.send({ success: true, story })
      })
      .catch(err => {
        res.send({ success: false, reason: err.message })
      })
  })

  app.post('/api/story/publish/', (req, res) => {
    if (!req.session.user) {
      return res.status(401).send({ success: false, reason: 'Not authenticated' })
    }
    const { id, published } = req.body
    prisma.story.findUnique({ where: { id: parseInt(id, 10) } })
      .then(story => {
        if (!story) {
          return res.send({ success: false, reason: 'Could not find story' })
        }
        if (story.author !== req.session.user.username) {
          return res.status(403).send({ success: false, reason: 'Not authorized' })
        }
        return prisma.story.update({ where: { id: story.id }, data: { published } })
          .then(() => res.send({ success: true }))
      })
      .catch(err => {
        res.send({ success: false, reason: err.message })
      })
  })
}
