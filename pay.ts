use serde::{Serialize, Deserialize};
use reqwest::Client;
use rocket::response::content;

// Define the Payment struct
#[derive(Serialize, Deserialize)]
struct Payment {
    amount: f64,
    currency: String,
    payment_method: String,
    card_number: String,
    expiration_date: String,
    cvv: String,
}

// Define the PaymentGateway trait
trait PaymentGateway {
    fn process_payment(&self, payment: Payment) -> Result<(), String>;
}

// Implement the PaymentGateway trait for Stripe
struct StripePaymentGateway {
    api_key: String,
}

impl PaymentGateway for StripePaymentGateway {
    fn process_payment(&self, payment: Payment) -> Result<(), String> {
        let client = Client::new();
        let url = "https://api.stripe.com/v1/charges";
        let params = [
            ("amount", payment.amount.to_string()),
            ("currency", payment.currency.to_string()),
            ("payment_method", payment.payment_method.to_string()),
            ("card[number]", payment.card_number.to_string()),
            ("card[exp_month]", payment.expiration_date.split("/").next().unwrap().to_string()),
            ("card[exp_year]", payment.expiration_date.split("/").skip(1).next().unwrap().to_string()),
            ("card[cvc]", payment.cvv.to_string()),
        ];
        let res = client.post(url)
           .header("Authorization", format!("Bearer {}", self.api_key))
           .form(&params)
           .send();
        match res {
            Ok(res) => {
                if res.status().is_success() {
                    Ok(())
                } else {
                    Err("Payment failed".to_string())
                }
            }
            Err(err) => Err(err.to_string()),
        }
    }
}

// Implement the PaymentGateway trait for PayPal
struct PayPalPaymentGateway {
    api_key: String,
    api_secret: String,
}

impl PaymentGateway for PayPalPaymentGateway {
    fn process_payment(&self, payment: Payment) -> Result<(), String> {
      
        // Implement PayPal payment logic here
        unimplemented!();
    }
}

// Define the PaymentController struct
struct PaymentController {
    payment_gateway: Box<dyn PaymentGateway>,
}

impl PaymentController {
    fn new(payment_gateway: Box<dyn PaymentGateway>) -> Self {
        PaymentController { payment_gateway }
    }

    fn process_payment(&self, payment: Payment) -> Result<(), String> {
        self.payment_gateway.process_payment(payment)
    }
}

// Define the Rocket route for processing payments
#[rocket::get("/process_payment")]
fn process_payment(payment_controller: &PaymentController, payment: Payment) -> content::Json<String> {
    match payment_controller.process_payment(payment) {
        Ok(_) => content::Json("Payment successful!".to_string()),
        Err(err) => content::Json(err),
    }
}

fn main() {
    let payment_gateway = Box::new(StripePaymentGateway {
        api_key: "YOUR_STRIPE_API_KEY".to_string(),
    });
    let payment_controller = PaymentController::new(payment_gateway);
    rocket::ignite()
       .mount("/", routes![process_payment])
       .launch();
}
