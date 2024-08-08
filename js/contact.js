document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("contact-form");
  const loadingIndicator = document.getElementById("loading-indicator");

  form.addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent the form from submitting the traditional way

    // Show loading indicator
    loadingIndicator.style.display = "block";

    const formData = new FormData(form);
    const formObject = {};

    formData.forEach((value, key) => {
      formObject[key] = value;
    });

    const endpoint = "https://neroitech.vercel.app/api/contact"; // Your Next.js API route

    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formObject),
    })
      .then((response) => {
        // Hide loading indicator
        loadingIndicator.style.display = "none";

        if (response.ok) {
          // Handle success
          alert("Message sent successfully!");
          form.reset(); // Optional: reset the form after successful submission
        } else {
          // Handle errors
          return response.text().then((text) => {
            throw new Error(text);
          });
        }
      })
      .catch((error) => {
        // Hide loading indicator
        loadingIndicator.style.display = "none";

        console.error("Error:", error);
        alert("There was a problem sending your message.");
      });
  });
});
