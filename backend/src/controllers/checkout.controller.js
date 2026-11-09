// controllers/checkout.controller.js
const checkoutService = require('../services/checkout.service')
const mailService = require('../services/mail.service')
const prisma = require('../config/prisma')

exports.createOrder = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || null

    const order = await checkoutService.createOrder(
      req.body,
      userId,
      req.ip
    )

    const { customer, shipping, items, payment } = req.body

    let email = customer?.email || null

    if (!email && userId) {
      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
        select: { email: true },
      })

      email = user?.email || null
    }

    if (email) {
      try {
        await mailService.sendOrderConfirmation({
          to: email,
          orderId: order.orderNumber || order.id,
          items: order.items || items,
          total: order.totalPrice,
          shipping: {
            address: order.address || shipping?.address,
            city: order.city || shipping?.city,
            postal: order.postal || shipping?.postal,
            country: order.country || shipping?.country,
          },
          paymentMethod: order.paymentMethod || payment,
        })
    
        console.log('Bestätigungsmail wurde gesendet an:', email)
      } catch (mailError) {
        console.error(
          'Bestellung gespeichert, aber E-Mail konnte nicht gesendet werden:',
          mailError.message
        )
    
        return res.status(500).json({
          message:
            "Your order was saved, but the confirmation email could not be sent.",
        })
      }
    } else {
      return res.status(400).json({
        message: "No email address is available for the order confirmation.",
      })
    }

    return res.status(201).json({
      message: "Order placed successfully",
      order,
    })
  } catch (err) {
    console.error('CHECKOUT ERROR:', err.message)

    const status = err.message.includes("Too many attempts") ? 429 : 500

    return res.status(status).json({
      message: err.message || "Could not place order",
    })
  }
}

exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.userId

    if (!userId) {
      return res.status(401).json({
        message: "Not signed in",
      })
    }

    const orders = await checkoutService.getOrdersByUserId(Number(userId))

    return res.json({ orders })
  } catch (err) {
    console.error('ORDER HISTORY ERROR:', err.message)

    return res.status(500).json({
      message: "Could not load orders",
      error: err.message,
    })
  }
}
