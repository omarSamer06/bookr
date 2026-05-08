import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../models/User.js'
import Business from '../models/Business.js'

const DEMO_PASSWORD = 'Demo@1234'

async function connectOrThrow() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    throw new Error('Missing MONGO_URI in environment')
  }
  await mongoose.connect(uri)
}

function logOk(msg) {
  console.log(`✅ ${msg}`)
}

function logSkip(msg) {
  console.log(`↩️  ${msg}`)
}

async function ensureUser({ name, email, password, role }) {
  const existing = await User.findOne({ email: String(email).toLowerCase().trim() })
  if (existing) {
    logSkip(`User exists: ${existing.email} (${existing.role})`)
    return existing
  }

  const created = await User.create({
    name,
    email,
    password,
    role,
  })

  logOk(`Created user: ${created.email} (${created.role})`)
  return created
}

function demoWorkingHours() {
  const open = '09:00'
  const close = '18:00'
  return {
    monday: { isOff: false, open, close },
    tuesday: { isOff: false, open, close },
    wednesday: { isOff: false, open, close },
    thursday: { isOff: false, open, close },
    friday: { isOff: false, open, close },
    saturday: { isOff: false, open, close },
    sunday: { isOff: true, open, close },
  }
}

async function ensureDemoBusiness(ownerId) {
  const existing = await Business.findOne({ owner: ownerId })
  if (existing) {
    logSkip(`Business exists for owner: ${existing.name}`)
    return existing
  }

  const created = await Business.create({
    owner: ownerId,
    name: 'Bookr Demo Business',
    description:
      "This is a demo business to showcase Bookr's features. Explore the owner dashboard, manage appointments, and see AI-powered insights.",
    category: 'beauty',
    location: { address: '123 Demo Street', city: 'Cairo', country: 'Egypt' },
    phone: '+20 100 000 0000',
    paymentMode: 'both',
    slotDuration: 30,
    workingHours: demoWorkingHours(),
    breaks: [{ name: 'Lunch Break', start: '13:00', end: '14:00' }],
    services: [
      {
        name: 'Consultation',
        description: '30-minute consultation session',
        duration: 30,
        price: 0,
        isActive: true,
      },
      {
        name: 'Basic Service',
        description: 'Standard 1-hour service',
        duration: 60,
        price: 50,
        isActive: true,
      },
      {
        name: 'Premium Service',
        description: 'Premium 90-minute experience',
        duration: 90,
        price: 120,
        isActive: true,
      },
    ],
  })

  logOk(`Created business: ${created.name}`)
  return created
}

async function main() {
  await connectOrThrow()
  logOk('Connected to MongoDB')

  const owner = await ensureUser({
    name: 'Demo Owner',
    email: 'owner@bookrdemo.com',
    password: DEMO_PASSWORD,
    role: 'owner',
  })

  const client = await ensureUser({
    name: 'Demo Client',
    email: 'client@bookrdemo.com',
    password: DEMO_PASSWORD,
    role: 'client',
  })

  await ensureDemoBusiness(owner._id)

  logOk('Demo seed complete')
  logOk(`Owner login: ${owner.email} / ${DEMO_PASSWORD}`)
  logOk(`Client login: ${client.email} / ${DEMO_PASSWORD}`)
}

main()
  .catch((err) => {
    console.error('❌ Demo seed failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await mongoose.disconnect()
      logOk('Disconnected from MongoDB')
    } catch {
      // ignore disconnect errors
    }
  })

