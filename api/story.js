const { Story } = require('../models/models.js')

module.exports = app => {
  app.get('/api/stories/', (req, res) => {
    Story.find({ published: true })
      .then(result => {
        res.send({ success: true, stories: result })
      })
      .catch(err => {
        res.send({ success: false, reason: err })
      })
  })

  app.get('/api/stories/:author', (req, res) => {
    const { author } = req.params
    let query = Story.find({ author })
    if (!req.session.user || author !== req.session.user.username) {
      query = query.where({ published: true })
    }
    query.then(result => {
      res.send({ success: true, stories: result })
    })
    .catch(err => {
      res.send({ success: false, reason: err })
    })
  })

  app.get('/api/story/:id', (req, res) => {
    const { id } = req.params
    Story.findById(id).then(result => {
      res.send({ success: true, story: result })
    }).catch(err => {
      res.send({ success: false, reason: err })
    })
  })

  app.post('/api/story/publish/', (req, res) => {
    if (!req.session.user) {
      return res.status(401).send({ success: false, reason: 'Not authenticated' })
    }
    const { id, published } = req.body
    Story.findById(id).then(story => {
      if (!story) {
        res.send({ success: false, reason: 'couldnt find story!' })
      } else if (story.author !== req.session.user.username) {
        res.status(403).send({ success: false, reason: 'Not authorized' })
      } else {
        story.published = published
        story.save()
          .then(() => {
            res.send({ success: true })
          })
          .catch(err => {
            res.send({ success: false, reason: err })
          })
      }
    }).catch(err => {
      res.send({ success: false, reason: err })
    })
  })
}
