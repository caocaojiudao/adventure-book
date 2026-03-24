const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const SALT_FACTOR = 10

const prisma = new PrismaClient()

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(SALT_FACTOR)
  return bcrypt.hash(password, salt)
}

async function comparePassword(candidatePassword, hashedPassword) {
  return bcrypt.compare(candidatePassword, hashedPassword)
}

module.exports = { prisma, hashPassword, comparePassword }
