export default function TermsOfService() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-black tracking-tight text-primary">Terms of Service</h1>
      
      <div className="prose prose-sm sm:prose-base dark:prose-invert prose-p:text-secondary prose-headings:text-primary">
        <p className="lead text-lg text-secondary mb-8">
          By accessing the KinaHub website and mobile application, you are agreeing to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">1. Use License</h2>
        <p className="mb-4 text-secondary">
          Permission is granted to temporarily download one copy of the materials (information or software) on KinaHub's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
        </p>
        <ul className="list-disc pl-5 mb-6 text-secondary space-y-2">
          <li>modify or copy the materials;</li>
          <li>use the materials for any commercial purpose, or for any public display;</li>
          <li>attempt to decompile or reverse engineer any software contained on KinaHub's website;</li>
          <li>remove any copyright or other proprietary notations from the materials; or</li>
          <li>transfer the materials to another person or "mirror" the materials on any other server.</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-4">2. Marketplace Rules</h2>
        <p className="mb-6 text-secondary">
          KinaHub acts as a marketplace connecting buyers with local sellers. While we strive to ensure the quality and authenticity of all listed items, KinaHub is not the direct seller of most items on the platform. Sellers are responsible for the accuracy of their product listings, and buyers agree to review items upon delivery.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">3. Limitations</h2>
        <p className="mb-6 text-secondary">
          In no event shall KinaHub or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on KinaHub's website, even if KinaHub or a KinaHub authorized representative has been notified orally or in writing of the possibility of such damage.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">4. Revisions and Errata</h2>
        <p className="mb-6 text-secondary">
          The materials appearing on KinaHub's website could include technical, typographical, or photographic errors. KinaHub does not warrant that any of the materials on its website are accurate, complete or current. KinaHub may make changes to the materials contained on its website at any time without notice.
        </p>

        <p className="mt-12 text-sm text-secondary border-t border-border pt-6">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
