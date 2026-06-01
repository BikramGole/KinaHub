export default function PrivacyPolicy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-black tracking-tight text-primary">Privacy Policy</h1>
      
      <div className="prose prose-sm sm:prose-base dark:prose-invert prose-p:text-secondary prose-headings:text-primary">
        <p className="lead text-lg text-secondary mb-8">
          Your privacy is important to us. It is KinaHub's policy to respect your privacy regarding any information we may collect from you across our website and applications.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">1. Information We Collect</h2>
        <p className="mb-4 text-secondary">
          We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used.
        </p>
        <ul className="list-disc pl-5 mb-6 text-secondary space-y-2">
          <li>Account information (name, email, password)</li>
          <li>Delivery addresses and contact numbers</li>
          <li>Order history and preferences</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-4">2. Use of Information</h2>
        <p className="mb-4 text-secondary">
          We use the information we collect in various ways, including to:
        </p>
        <ul className="list-disc pl-5 mb-6 text-secondary space-y-2">
          <li>Provide, operate, and maintain our platform</li>
          <li>Improve, personalize, and expand our services</li>
          <li>Process your transactions and manage orders</li>
          <li>Communicate with you regarding updates, support, and marketing</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-4">3. Data Storage and Security</h2>
        <p className="mb-6 text-secondary">
          We only retain collected information for as long as necessary to provide you with your requested service. What data we store, we’ll protect within commercially acceptable means to prevent loss and theft, as well as unauthorized access, disclosure, copying, use or modification.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">4. Third-Party Services</h2>
        <p className="mb-6 text-secondary">
          Our website may link to external sites that are not operated by us. Please be aware that we have no control over the content and practices of these sites, and cannot accept responsibility or liability for their respective privacy policies.
        </p>

        <p className="mt-12 text-sm text-secondary border-t border-border pt-6">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
