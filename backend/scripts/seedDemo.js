import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../models/User.js'
import Business from '../models/Business.js'
import Appointment from '../models/Appointment.js'

const DEMO_PASSWORD = 'Demo@1234'
const SEED_TAG = 'seed:demo:luxe_v1'

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

function randInt(min, max) {
  const a = Math.ceil(min)
  const b = Math.floor(max)
  return Math.floor(Math.random() * (b - a + 1)) + a
}

function pickOne(list) {
  return list[randInt(0, list.length - 1)]
}

function utcStartOfDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function addMinutesToClock(startTime, minutes) {
  const [hhRaw, mmRaw] = String(startTime).split(':')
  const hh = Number(hhRaw)
  const mm = Number(mmRaw)
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null
  const total = hh * 60 + mm + Number(minutes || 0)
  const clamped = ((total % (24 * 60)) + 24 * 60) % (24 * 60)
  const outH = String(Math.floor(clamped / 60)).padStart(2, '0')
  const outM = String(clamped % 60).padStart(2, '0')
  return `${outH}:${outM}`
}

function luxeWorkingHours() {
  return {
    monday: { isOff: false, open: '10:00', close: '21:00' },
    tuesday: { isOff: false, open: '10:00', close: '21:00' },
    wednesday: { isOff: false, open: '10:00', close: '21:00' },
    thursday: { isOff: false, open: '10:00', close: '21:00' },
    friday: { isOff: false, open: '14:00', close: '22:00' },
    saturday: { isOff: false, open: '10:00', close: '22:00' },
    sunday: { isOff: true },
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
    name: 'Luxe Beauty Lounge',
    description:
      "Cairo's premier beauty destination offering a full range of hair, skin, and nail treatments. Our expert team of certified stylists and therapists are dedicated to making you look and feel your best in a luxurious, relaxing environment.",
    category: 'beauty',
    location: { address: '15 Tahrir Square', city: 'Cairo', country: 'Egypt' },
    phone: '+20 100 123 4567',
    paymentMode: 'both',
    slotDuration: 30,
    workingHours: luxeWorkingHours(),
    breaks: [{ name: 'Staff Break', start: '15:00', end: '15:30' }],
    services: [
      {
        name: 'Haircut & Styling',
        description: 'Precision cut and professional blow-dry styling by our senior stylists',
        duration: 60,
        price: 25,
        isActive: true,
      },
      {
        name: 'Hair Coloring',
        description: 'Full color, highlights, or balayage using premium professional products',
        duration: 120,
        price: 80,
        isActive: true,
      },
      {
        name: 'Classic Facial',
        description: 'Deep cleansing facial with exfoliation, mask, and moisturizing treatment',
        duration: 60,
        price: 45,
        isActive: true,
      },
      {
        name: 'Gel Manicure',
        description: 'Long-lasting gel polish manicure with nail shaping and cuticle care',
        duration: 45,
        price: 30,
        isActive: true,
      },
      {
        name: 'Full Body Massage',
        description: 'Relaxing Swedish massage to relieve tension and restore balance',
        duration: 90,
        price: 70,
        isActive: true,
      },
      {
        name: 'Bridal Package',
        description: 'Complete bridal beauty preparation including hair, makeup, and nails',
        duration: 180,
        price: 200,
        isActive: true,
      },
    ],
  })

  logOk(`Created business: ${created.name}`)
  return created
}

async function ensureSeedAppointments({ business, owner, client }) {
  const existing = await Appointment.countDocuments({
    business: business._id,
    client: client._id,
    notes: SEED_TAG,
  })

  if (existing >= 15) {
    logSkip(`Seed appointments exist (${existing})`)
    return
  }

  const timeSlots = ['10:00', '11:30', '14:00', '15:30', '16:00']
  const services = (business.services ?? []).filter((s) => s?.isActive !== false)

  const targets = [
    ...Array.from({ length: 10 }).map(() => 'completed'),
    ...Array.from({ length: 3 }).map(() => 'cancelled'),
    ...Array.from({ length: 2 }).map(() => 'no-show'),
  ]

  const rows = targets.map((status) => {
    const daysAgo = randInt(1, 30)
    const raw = new Date()
    raw.setUTCDate(raw.getUTCDate() - daysAgo)
    const date = utcStartOfDay(raw)

    const service = pickOne(services)
    const startTime = pickOne(timeSlots)
    const endTime = addMinutesToClock(startTime, service.duration) ?? '00:00'

    const paymentStatus = status === 'completed' ? 'paid' : 'unpaid'
    const completedAt = status === 'completed' ? new Date(date.getTime() + randInt(2, 10) * 60 * 60 * 1000) : null
    const cancelledAt = status === 'cancelled' ? new Date(date.getTime() + randInt(1, 6) * 60 * 60 * 1000) : null

    return {
      business: business._id,
      client: client._id,
      service: {
        name: service.name,
        duration: Number(service.duration),
        price: Number(service.price),
      },
      date,
      startTime,
      endTime,
      status,
      paymentStatus,
      paymentIntentId: '',
      notes: SEED_TAG,
      reminderSent: true,
      followUpSent: true,
      completedAt,
      cancelledAt,
      cancelledBy: status === 'cancelled' ? owner._id : null,
    }
  })

  await Appointment.insertMany(rows, { ordered: false })
  logOk(`Seeded appointments: ${rows.length}`)
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

  const demoClient = await ensureUser({
    name: 'Sara Ahmed',
    email: 'sara@demo.com',
    password: DEMO_PASSWORD,
    role: 'client',
  })

  const business = await ensureDemoBusiness(owner._id)
  await ensureSeedAppointments({ business, owner, client: demoClient })

  logOk('Demo seed complete')
  logOk(`Owner login: ${owner.email} / ${DEMO_PASSWORD}`)
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

