import React, { useState, FormEvent } from 'react';

const CheckoutForm: React.FC = () => {
  const [input, setInput] = useState<{ customDonation: number }>({ customDonation: 0 });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    try {
      // Create a Checkout Session.
      // const checkoutSession: Stripe.Checkout.Session = await fetchPostJSON(
      //   '/api/checkout_sessions',
      //   { amount: input.customDonation },
      // );

      // Handle server-side error
      // if ((checkoutSession as any).statusCode === 500) {
      //   console.error((checkoutSession as any).message);
      //   return;
      // }

      // Redirect to Checkout.
      // const stripe = await getStripe();
      // const { error } = await stripe!.redirectToCheckout({
      //   // Pass the id from the Checkout Session creation API response
      //   sessionId: checkoutSession.id,
      // });

      // If `redirectToCheckout` fails due to a browser or network
      // error, display the localized error message to your customer
      // using `error.message`.
      // if (error) {
      //   console.warn(error.message);
      // }
    } catch (error) {
      // Handle other types of errors (e.g., network issues)
      console.error('An error occurred:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Custom Donation:
        <input
          type="number"
          value={input.customDonation}
          onChange={(e) => setInput({ customDonation: Number(e.target.value) })}
          />
      </label>
      <button type="submit">Proceed to Checkout</button>
    </form>
  );
};

export default CheckoutForm;
