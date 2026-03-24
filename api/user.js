const { prisma, hashPassword, comparePassword } = require('../models/models.js')

module.exports = app => {

  app.post('/api/login', (req, res) => {
    const { username, password } = req.body
    prisma.user.findUnique({ where: { username } })
      .then(user => {
        const userExists = user !== null
        const clientUser = userExists && { username: user.username, id: user.id }
        if (userExists) {
          comparePassword(password, user.password).then(isMatch => {
            if (isMatch) {
              req.session.user = clientUser
              res.send({ success: true, userExists, user: clientUser })
            } else {
              res.send({ success: false, reason: 'Password incorrect' })
            }
          })
        } else {
          res.send({ userExists, user: clientUser })
        }
      })
      .catch(err => {
        res.send({ success: false, reason: err.message })
      })
  })

  app.post('/api/signup', (req, res) => {
    const { username, password, email } = req.body
    prisma.user.findUnique({ where: { username } })
      .then(existing => {
        if (existing) {
          return res.send({ success: false, reason: 'user already exists' })
        }
        return hashPassword(password).then(hashed => {
          return prisma.user.create({ data: { username, email, password: hashed } })
            .then(result => {
              const clientUser = { username: result.username, id: result.id }
              req.session.user = clientUser
              res.send({ success: true, user: clientUser })
            })
        })
      })
      .catch(err => {
        res.send({ success: false, reason: err.message })
      })
  })

  app.get('/api/logout', (req, res) => {
    req.session.destroy(() => {
      res.end()
    })
  })

  app.post('/api/auth', (req, res) => {
    if (req.session.user) {
      res.send(req.session.user)
    } else {
      res.send(false)
    }
  })

}
