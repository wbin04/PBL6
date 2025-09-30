#!/usr/bin/env node

// Test cart API để kiểm tra response
const fetch = require("node-fetch");

async function testCartAPI() {
  try {
    // Lấy token từ localStorage hoặc hardcode để test
    const token = "YOUR_TOKEN_HERE"; // Thay bằng token thực tế

    const response = await fetch("http://localhost:8000/api/cart/", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.log("Response status:", response.status);
      console.log("Response statusText:", response.statusText);
      const errorText = await response.text();
      console.log("Error response:", errorText);
      return;
    }

    const data = await response.json();
    console.log("Full cart response:");
    console.log(JSON.stringify(data, null, 2));

    if (data.items && data.items.length > 0) {
      console.log("\nFirst item details:");
      console.log("- Food ID:", data.items[0].food.id);
      console.log("- Food title:", data.items[0].food.title);
      console.log("- Food price:", data.items[0].food.price);
      console.log("- Food store_name:", data.items[0].food.store_name);
      console.log("- Food object keys:", Object.keys(data.items[0].food));
    }
  } catch (error) {
    console.error("Error testing cart API:", error);
  }
}

console.log("Testing Cart API...");
testCartAPI();
