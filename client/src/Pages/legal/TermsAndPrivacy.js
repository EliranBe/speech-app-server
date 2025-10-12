import React, { useEffect, useState } from "react";

export default function TermsAndPrivacy() {
  const [activeSection, setActiveSection] = useState("terms");

  useEffect(() => {
    const handleScroll = () => {
      const termsTop = document.getElementById("terms").offsetTop;
      const privacyTop = document.getElementById("privacy").offsetTop;
      const scrollPos = window.scrollY + 100; // offset to trigger earlier

      if (scrollPos >= privacyTop) {
        setActiveSection("privacy");
      } else if (scrollPos >= termsTop) {
        setActiveSection("terms");
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const linkStyle = (section) => ({
    fontWeight: activeSection === section ? "700" : "500",
    color: activeSection === section ? "#007bff" : "#555",
    display: "block",
    marginBottom: "1rem",
    cursor: "pointer",
    textDecoration: "none",
  });

  return (
    <div style={{ display: "flex", padding: "2rem", fontFamily: "'Segoe UI', sans-serif", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Sidebar */}
      <nav style={{ flex: "0 0 220px", marginRight: "2rem", position: "sticky", top: "20px", alignSelf: "flex-start" }}>
        <h3 style={{ marginBottom: "1rem" }}>Legal Sections</h3>
        <a href="#terms" style={linkStyle("terms")}>Terms of Service</a>
        <a href="#privacy" style={linkStyle("privacy")}>Privacy Policy</a>
      </nav>

      {/* Main Content */}
      <div style={{ flex: "1", lineHeight: "1.6", color: "#333" }}>
        <p style={{ fontStyle: "italic", marginBottom: "2rem" }}>
          Note: This document is written in English. It is your responsibility to translate it into your native language if needed.
        </p>

        {/* Terms */}
        <section id="terms">
          <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>Terms of Service</h2>

          <h3>1. Acceptance of Terms</h3>
          <p>
            By accessing or using this website and/or mobile application ("Service"), you agree to be bound by these Terms of Service, our Privacy Policy, and any applicable laws and regulations. If you do not agree, you must not use the Service.
          </p>

          <h3>2. Use of Service</h3>
          <ul>
            <li>Violate any applicable laws.</li>
            <li>Use the Service for unauthorized commercial purposes.</li>
            <li>Interfere with the integrity or performance of the Service.</li>
            <li>Attempt unauthorized access.</li>
          </ul>

          <h3>3. User Accounts</h3>
          <p>You are responsible for maintaining the confidentiality of your account credentials and must notify us of any unauthorized use.</p>

          <h3>4. Limitation of Liability</h3>
          <p>
            The Service is provided "as is" and "as available" without warranties. The developer, owners, or affiliates are not liable for damages, loss of data, profits, or legal claims arising from your use of the Service. You agree not to hold the developer responsible for claims, damages, or legal actions resulting from your use of the Service, including errors, bugs, viruses, third-party content, or service interruptions.
          </p>
          <p>Verbo.io is currently in beta. There may be errors or issues, and by registering for this service, you agree not to make any claims or complaints against Verbo.io.</p>

          <h3>5. Intellectual Property</h3>
          <p>All content, logos, trademarks, and software are owned by the developer or licensors. You may not reproduce or distribute without permission.</p>

          <h3>6. Termination</h3>
          <p>We may suspend or terminate your access at our discretion.</p>
          <p>Verbo.io reserves the right to suspend any account without prior notice and without providing any explanation.</p>

          <h3>7. Changes to Terms</h3>
          <p>We may update these Terms at any time; continued use constitutes acceptance.</p>
          <p>Even if not all minutes of a meeting have been used, it will not be possible to return to it.</p>
          <p>Verbo.io reserves the right to change, freeze, or cancel usage plans unilaterally and without prior notice.</p>
          <p>Monthly limit applies; it may not be possible to use all meetings – first come, first served.</p>

          </section>

        <hr style={{ margin: "3rem 0", border: "1px solid #ccc" }} />

        {/* Privacy */}
        <section id="privacy">
          <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>Privacy Policy</h2>

          <h3>1. Information Collection</h3>
          <p>We may collect information you provide directly (email, password, preferences) and technical data about your device, IP address, and usage patterns.</p>

          <h3>2. Use of Information</h3>
          <p>Data is used to provide, maintain, and improve the Service, communicate with you, and ensure security and compliance.</p>

          <h3>3. Sharing of Information</h3>
          <p>We do not sell or rent personal information. Data may be shared with trusted service providers or legal authorities as required by law.</p>

          <h3>4. Cookies and Tracking</h3>
          <p>The Service may use cookies or similar tracking technologies for user experience and analytics.</p>

          <h3>5. Data Security</h3>
          <p>Reasonable measures are implemented to protect data; however, absolute security cannot be guaranteed.</p>

          <h3>6. Third-Party Services</h3>
          <p>The Service may link to or integrate with third-party services. We are not responsible for their privacy practices or content.</p>

          <h3>7. Children's Privacy</h3>
          <p>The Service is not intended for individuals under 13. We do not knowingly collect information from children.</p>

          <h3>8. Changes to Privacy Policy</h3>
          <p>We may update this policy at any time. Continued use constitutes acceptance.</p>


        </section>
      </div>
    </div>
  );
}
