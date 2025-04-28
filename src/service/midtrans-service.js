import midtransClient from 'midtrans-client';

class MidtransService {
  constructor() {
    this.core = new midtransClient.CoreApi({
      isProduction: process.env.MIDTRANS_ENV === 'production',
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY
    });

    this.snap = new midtransClient.Snap({
      isProduction: process.env.MIDTRANS_ENV === 'production',
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY
    });
  }

  async createTransaction(order) {
    const paymentMethods = {
      BANK_TRANSFER: this.handleBankTransfer,
      MANDIRI_BILL: this.handleMandiriBill,
      QRIS: this.handleQRIS,
      CREDIT_CARD: this.handleCreditCard
    };

    const handler = paymentMethods[order.paymentMethod] || this.handleDefault;
    return handler(order);
  }

  async handleBankTransfer(order) {
    const parameter = {
      payment_type: 'bank_transfer',
      transaction_details: {
        order_id: order.id,
        gross_amount: order.totalAmount
      },
      bank_transfer: {
        bank: 'bri' // Default bank, bisa diganti atau ditambahkan bank lain
      },
      customer_details: this.getCustomerDetails(order)
    };

    const response = await this.core.charge(parameter);
    return {
      paymentType: 'bank_transfer',
      paymentData: {
        vaNumber: response.va_numbers?.[0]?.va_number || response.account_number,
        bank: response.va_numbers?.[0]?.bank || response.bank,
        expiryTime: response.expiry_time
      }
    };
  }

  async handleMandiriBill(order) {
    const parameter = {
      payment_type: 'echannel',
      transaction_details: {
        order_id: order.id,
        gross_amount: order.totalAmount
      },
      echannel: {
        bill_info1: 'Payment for Order',
        bill_info2: 'Online Purchase'
      },
      customer_details: this.getCustomerDetails(order)
    };

    const response = await this.core.charge(parameter);
    return {
      paymentType: 'mandiri_bill',
      paymentData: {
        billKey: response.bill_key,
        billingCode: response.biller_code
      }
    };
  }

  async handleQRIS(order) {
    const parameter = {
      payment_type: 'qris',
      transaction_details: {
        order_id: order.id,
        gross_amount: order.totalAmount
      },
      qris: {
        acquirer: 'gopay' // Bisa diganti dengan 'shopee' atau lainnya
      },
      customer_details: this.getCustomerDetails(order)
    };

    const response = await this.core.charge(parameter);
    return {
      paymentType: 'qris',
      paymentData: {
        qrCodeUrl: response.actions?.[0]?.url,
        expiryTime: response.expiry_time
      }
    };
  }

  async handleCreditCard(order) {
    const parameter = {
      payment_type: 'credit_card',
      transaction_details: {
        order_id: order.id,
        gross_amount: order.totalAmount
      },
      credit_card: {
        secure: true,
        bank: 'bni' // Bisa diganti dengan bank lain
      },
      customer_details: this.getCustomerDetails(order)
    };

    const response = await this.core.charge(parameter);
    return {
      paymentType: 'credit_card',
      paymentData: {
        redirectUrl: response.redirect_url,
        token: response.token
      }
    };
  }

  async handleDefault(order) {
    // Default menggunakan Snap untuk payment method lainnya
    const parameter = {
      transaction_details: {
        order_id: order.id,
        gross_amount: order.totalAmount
      },
      customer_details: this.getCustomerDetails(order),
      enabled_payments: [
        'credit_card',
        'bca_va', 'bni_va', 'bri_va', 'permata_va', 'cimb_va',
        'mandiri_bill',
        'qris',
        'gopay',
        'shopeepay'
      ]
    };

    const response = await this.snap.createTransaction(parameter);
    return {
      paymentType: 'snap',
      paymentData: {
        token: response.token,
        redirectUrl: response.redirect_url
      }
    };
  }

  getCustomerDetails(order) {
    return {
      first_name: order.customerName.split(' ')[0],
      last_name: order.customerName.split(' ').slice(1).join(' ') || ' ',
      email: order.customerEmail,
      phone: order.customerPhone,
      billing_address: {
        address: order.shippingAddress,
        city: order.shippingCity,
        postal_code: order.shippingPostCode
      }
    };
  }
}

export default new MidtransService();