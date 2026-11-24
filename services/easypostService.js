export const createEasyPostShipment = async (order) => {
  const apiKey = process.env.EASYPOST_API_KEY;
  if (!apiKey || !apiKey.startsWith("EZTK")) {
    throw new Error(
      "Safety Block: Only EasyPost Test API Key (EZTK...) is allowed!",
    );
  }

  const authHeader = "Basic " + Buffer.from(`${apiKey}:`).toString("base64");

  // 1. إنشاء الشحنة وطلب عروض الأسعار (Rates)
  const createRes = await fetch("https://easypost.com", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify({
      shipment: {
        reference: order._id.toString(), // نربط الشحنة برقم الطلب في قاعدتنا
        to_address: {
          name: order.customer?.fullName || "Test Customer",
          street1: order.customer?.address || "179 N Harbor Dr",
          city: "Redondo Beach",
          state: "CA",
          zip: "90277",
          country: "US",
          phone: order.customer?.phone || "415-555-1212",
        },
        from_address: {
          company: "Course & Store Platform",
          street1: "417 Montgomery Street",
          city: "San Francisco",
          state: "CA",
          zip: "94104",
          country: "US",
          phone: "415-528-7555",
        },
        parcel: {
          length: 10,
          width: 8,
          height: 4,
          weight: 15.4,
        },
      },
    }),
  });

  const shipment = await createRes.json();
  if (!createRes.ok) {
    throw new Error(
      shipment.error?.message || "Failed to create EasyPost shipment",
    );
  }

  // 2. اختيار أرخص عرض شحن وشراء البوليصة التجريبية تلقائياً
  const lowestRate = shipment.rates?.sort(
    (a, b) => parseFloat(a.rate) - parseFloat(b.rate),
  );

  if (!lowestRate) {
    throw new Error("No shipping rates returned from EasyPost");
  }

  const buyRes = await fetch(`https://easypost.com/${shipment.id}/buy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify({ rate: { id: lowestRate.id } }),
  });

  const boughtShipment = await buyRes.json();
  if (!buyRes.ok) {
    throw new Error(
      boughtShipment.error?.message || "Failed to buy EasyPost label",
    );
  }

  return {
    shipmentId: boughtShipment.id,
    trackingNumber: boughtShipment.tracking_code,
    carrier: lowestRate.carrier,
    service: lowestRate.service,
    rate: lowestRate.rate,
    labelUrl: boughtShipment.postage_label?.label_url,
  };
};
