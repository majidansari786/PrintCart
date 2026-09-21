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
    print_status: {
        type: String,
        required: true
    }
})

const orderModel = mongoose.model('Order', orderSchema)

module.exports=orderModel