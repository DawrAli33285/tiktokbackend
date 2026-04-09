const Subscription = require('../models/subscription') 
const usermodel = require('../models/user') 
 
const stripeWebhook = async (req, res) => { 
    const stripe = require('stripe')(process.esnv.STRIPE_SECRET_KEY) 
    
    try { 
        const sig = req.headers['stripe-signature'] 
 
        let event 
        try { 
            event = stripe.webhooks.constructEvent( 
                req.body, 
                sig, 
                process.env.STRIPE_WEBHOOK_SECRET 
            ) 
        } catch (err) { 
            return res.status(400).json({ message: `Webhook error: ${err.message}` }) 
        } 
 
        const stripeSubscription = event.data.object 
 
        switch (event.type) { 
 
            case 'customer.subscription.deleted': 
                
                
                const deletedSub = await Subscription.findOneAndDelete( 
                    { stripeSubscriptionId: stripeSubscription.id } 
                ) 
                if (deletedSub) { 
                    await usermodel.findOneAndUpdate( 
                        { _id: deletedSub.user }, 
                        { isPremium: false } 
                    ) 
                } 
                break 
 
            case 'invoice.payment_succeeded': 
                if (stripeSubscription.subscription) { 
                    await Subscription.findOneAndUpdate( 
                        { stripeSubscriptionId: stripeSubscription.subscription }, 
                        { 
                            status:          'active', 
                            currentPeriodEnd: new Date(stripeSubscription.period_end * 1000), 
                        } 
                    ) 
                } 
                break 
 
            case 'invoice.payment_failed': 
                if (stripeSubscription.subscription) { 
                    const failedSub = await Subscription.findOneAndDelete( 
                        { stripeSubscriptionId: stripeSubscription.subscription } 
                    ) 
                    if (failedSub) { 
                        await usermodel.findOneAndUpdate( 
                            { _id: failedSub.user }, 
                            { isPremium: false } 
                        ) 
                    } 
                } 
                break 
 
            case 'customer.subscription.paused': 
                await Subscription.findOneAndDelete( 
                    { stripeSubscriptionId: stripeSubscription.id } 
                ) 
                break 
 
            case 'customer.subscription.resumed': 
                await Subscription.findOneAndUpdate( 
                    { stripeSubscriptionId: stripeSubscription.id }, 
                    { status: 'active' } 
                ) 
                break 
 
            default: 
                break 
        } 
 
        res.status(200).json({ received: true }) 
    } catch (error) { 
        res.status(500).json({ message: 'Server error', error: error.message }) 
    } 
} 
 
module.exports = { stripeWebhook }