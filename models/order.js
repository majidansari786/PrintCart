import mongoose from 'mongoose';

const orderSchema = mongoose.Schema({
    order_by: {
        type: String,
        required: true
    },
    file_path: {
        type: String,
        required: true
    },
    color: {
        type: String,
        required: true
    },
    pages: {
        type: Number,
        required: true
    },
    copies: {
        type: Number,
        required: true
    },
    range: {
        type: String,
        required: true
    },
    print_status: {
        type: String,
        required: true
    },
    payment_order_id: {
        type: String,
        required: true,
        unique: true
    },
    payment_id: {
        type: String,
        required: true,
        unique: true
    }
})

const orderModel = mongoose.model('Order', orderSchema)

export default orderModel;