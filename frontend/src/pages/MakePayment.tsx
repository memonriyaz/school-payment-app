import React, { useState } from "react";

interface PaymentData {
  school_id: string;
  trustee_id: string;
  student_info: {
    name: string;
    id: string;
    email: string;
  };
  amount: number;
  gateway_name: string;
  description: string;
}

const MakePayment: React.FC = () => {
  const [formData, setFormData] = useState<PaymentData>({
    school_id: "65b0e6293e9f76a9694d84b4", // Valid EDVIRON school_id
    trustee_id: "65b0e552dd31950a9b41c5ba", // Valid EDVIRON trustee_id from API key
    student_info: {
      name: "",
      id: "",
      email: "",
    },
    amount: 0,
    gateway_name: "edviron",
    description: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState("");

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    if (name.startsWith("student_")) {
      const studentField = name.replace("student_", "");
      setFormData({
        ...formData,
        student_info: {
          ...formData.student_info,
          [studentField]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: name === "amount" ? parseFloat(value) || 0 : value,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Basic validation
    if (formData.amount <= 0) {
      setError("Amount must be greater than 0");
      setIsLoading(false);
      return;
    }

    if (!formData.student_info.email.includes("@")) {
      setError("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    try {
      // Use EDVIRON endpoint
      const API_URL = import.meta.env.VITE_API_URL;
      const endpoint = `${API_URL}/create-payment`;

      console.log(`Creating ${formData.gateway_name} payment with data:`, {
        ...formData,
        student_info: {
          ...formData.student_info,
          email: formData.student_info.email
            ? "[EMAIL_PROVIDED]"
            : "[NO_EMAIL]",
        },
      });

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log("Payment creation response:", {
        status: response.status,
        data,
      });

      if (response.ok) {
        setSuccess(true);
        // Handle different response formats
        const paymentUrl =
          data.payment_url || data.paymentUrl || data.payment_link || "";
        console.log("Payment URL extracted:", paymentUrl);
        setPaymentUrl(paymentUrl);

        // Auto-redirect to payment URL after 3 seconds (give user time to see success message)
        if (paymentUrl) {
          console.log("Setting up auto-redirect in 3 seconds...");
          setTimeout(() => {
            console.log("Redirecting to payment URL:", paymentUrl);
            window.location.href = paymentUrl;
          }, 3000);
        } else {
          console.warn("No payment URL found in response");
          setError(
            "Payment created but no payment URL received. Please contact support.",
          );
        }
      } else {
        console.error("Payment creation failed:", {
          status: response.status,
          data,
        });
        const errorMessage =
          data.message ||
          data.error ||
          `Payment creation failed (Status: ${response.status})`;
        setError(errorMessage);
      }
    } catch (err: any) {
      console.error("Payment creation error:", err);
      let errorMessage = "Payment creation failed. Please try again.";

      if (err.name === "TypeError" && err.message.includes("fetch")) {
        errorMessage =
          "Unable to connect to payment server. Please check your internet connection.";
      } else if (err.message) {
        errorMessage = `Payment creation failed: ${err.message}`;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      school_id: "65b0e6293e9f76a9694d84b4", // Valid EDVIRON school_id
      trustee_id: "65b0e552dd31950a9b41c5ba", // Valid EDVIRON trustee_id from API key
      student_info: {
        name: "",
        id: "",
        email: "",
      },
      amount: 0,
      gateway_name: "edviron",
      description: "",
    });
    setSuccess(false);
    setPaymentUrl("");
    setError("");
  };

  if (success) {
    return (
      <div className="space-y-6">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">
              Payment Created Successfully!
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              Your payment request has been created. Redirecting to payment page
              in 3 seconds...
            </p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Payment Details
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  <strong>Student:</strong> {formData.student_info.name}
                </p>
                <p>
                  <strong>Amount:</strong> ₹{formData.amount}
                </p>
                <p>
                  <strong>Description:</strong> {formData.description}
                </p>
                <p>
                  <strong>Gateway:</strong> {formData.gateway_name}
                </p>
              </div>
              {paymentUrl && (
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => (window.location.href = paymentUrl)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Pay Now - Redirect Immediately
                    <svg
                      className="ml-2 -mr-1 w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </button>
                  <p className="text-xs text-gray-500">
                    Or wait for automatic redirect in 3 seconds...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleReset}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Create Another Payment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">
            Create Payment
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Create a new payment request for school fees and other educational
            expenses.
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Payment Error
                  </h3>
                  <p className="mt-2 text-sm text-red-700">{error}</p>
                  <div className="mt-3">
                    <p className="text-xs text-red-600">
                      If this issue persists, please contact support or try
                      using a different payment gateway.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* School Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              School Information
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="school_id"
                  className="block text-sm font-medium text-gray-700"
                >
                  School ID *
                </label>
                <input
                  type="text"
                  id="school_id"
                  name="school_id"
                  required
                  value={formData.school_id}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter school ID"
                />
              </div>
              <div>
                <label
                  htmlFor="trustee_id"
                  className="block text-sm font-medium text-gray-700"
                >
                  Trustee ID *
                </label>
                <input
                  type="text"
                  id="trustee_id"
                  name="trustee_id"
                  required
                  value={formData.trustee_id}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter trustee ID"
                />
              </div>
            </div>
          </div>

          {/* Student Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Student Information
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="student_name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Student Name *
                </label>
                <input
                  type="text"
                  id="student_name"
                  name="student_name"
                  required
                  value={formData.student_info.name}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter student name"
                />
              </div>
              <div>
                <label
                  htmlFor="student_id"
                  className="block text-sm font-medium text-gray-700"
                >
                  Student ID *
                </label>
                <input
                  type="text"
                  id="student_id"
                  name="student_id"
                  required
                  value={formData.student_info.id}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter student ID"
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="student_email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Student Email *
                </label>
                <input
                  type="email"
                  id="student_email"
                  name="student_email"
                  required
                  value={formData.student_info.email}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter student email"
                />
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Payment Information
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="amount"
                  className="block text-sm font-medium text-gray-700"
                >
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  required
                  min="1"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <label
                  htmlFor="gateway_name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Payment Gateway
                </label>
                <div className="mt-1 px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
                  EDVIRON (Integrated Payment Gateway)
                </div>
                <input type="hidden" name="gateway_name" value="edviron" />
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700"
                >
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter payment description (e.g., School fee payment, Library fee, etc.)"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating Payment..." : "Create Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MakePayment;
