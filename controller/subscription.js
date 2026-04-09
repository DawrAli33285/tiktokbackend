
const Subscription = require('../models/subscription')
const usermodel=require('../models/user')
const toDate = (unixTimestamp) => {
    if (!unixTimestamp) return null
    const d = new Date(unixTimestamp * 1000)
    return isNaN(d.getTime()) ? null : d
}


const calculatePeriodEnd = (interval) => {
    const date = new Date()
    if (interval === 'year') {
        date.setFullYear(date.getFullYear() + 1)
    } else {
        date.setMonth(date.getMonth() + 1)
    }
    return date
}


const createSubscription = async (req, res) => {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
    try {
        const { email, amount, currency = 'usd', interval = 'month', paymentMethod, planName } = req.body

        if (!paymentMethod) {
            return res.status(400).json({ message: 'Payment method is required' })
        }

        const existingSubscription = await Subscription.findOne({ user: req.user.id, status: 'active' })

        if (existingSubscription) {
            const stripeSubId = existingSubscription.stripeSubscriptionId

            if (!stripeSubId) {
                await Subscription.findByIdAndDelete(existingSubscription._id)
            } else {
                const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubId)

                await stripe.paymentMethods.attach(paymentMethod, {
                    customer: existingSubscription.stripeCustomerId
                })

                await stripe.customers.update(existingSubscription.stripeCustomerId, {
                    invoice_settings: { default_payment_method: paymentMethod }
                })

                const newPrice = await stripe.prices.create({
                    unit_amount: Math.round(amount * 100),
                    currency,
                    recurring: { interval },
                    product_data: { name: 'Barometre EGO vs LOVE Premium' }
                })

                await stripe.subscriptions.update(stripeSubscription.id, {
                    items: [{ id: stripeSubscription.items.data[0].id, price: newPrice.id }],
                    default_payment_method: paymentMethod,
                    proration_behavior: 'create_prorations',
                })

                await Subscription.findByIdAndDelete(existingSubscription._id)

                const updatedSubscription = await Subscription.create({
                    user:                 req.user.id,
                    plan:                 planName,
                    status:               'active',
                    stripeCustomerId:     existingSubscription.stripeCustomerId,
                    stripeSubscriptionId: stripeSubscription.id,
                    currentPeriodEnd: toDate(stripeSubscription.current_period_end) ?? calculatePeriodEnd(interval),
                })

                return res.status(200).json({
                    message: 'Subscription upgraded successfully',
                    subscription: updatedSubscription
                })
            }
        }

        const customer = await stripe.customers.create({
            email,
            payment_method: paymentMethod,
            invoice_settings: { default_payment_method: paymentMethod }
        })

        const price = await stripe.prices.create({
            unit_amount: Math.round(amount * 100),
            currency,
            recurring: { interval },
            product_data: { name: 'Barometre EGO vs LOVE Premium' }
        })

        const stripeSubscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: price.id }],
            default_payment_method: paymentMethod,
        })

        const subscription = await Subscription.create({
            user:                 req.user.id,
            plan:                 planName,
            status:               'active',
            stripeCustomerId:     customer.id,
            stripeSubscriptionId: stripeSubscription.id,
            currentPeriodEnd: toDate(stripeSubscription.current_period_end) ?? calculatePeriodEnd(interval),
        })

        await usermodel.findByIdAndUpdate(req.user.id, { isPremium: true })

        res.status(201).json({ message: 'Subscription created successfully', subscription })

    } catch (error) {
        console.log(error.message)
        res.status(500).json({ message: 'Server error', error: error.message })
    }
}

const getUserSubscription = async (req, res) => {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
    try {
        const subscription = await Subscription.findOne({ user: req.user.id })

        if (!subscription) {
            return res.status(404).json({ message: 'No subscription found for this user' })
        }

        res.status(200).json(subscription)
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message })
    }
}

module.exports = { createSubscription, getUserSubscription }