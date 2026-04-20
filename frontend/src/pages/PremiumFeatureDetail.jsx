import { Link, useParams } from 'react-router-dom';
import { premiumFeatureBySlug } from '../utils/premiumFeatures';
import BackButton from '../components/BackButton';

const PremiumFeatureDetail = () => {
  const { slug } = useParams();
  const feature = premiumFeatureBySlug[slug];

  if (!feature) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-6">
        <div className="max-w-3xl mx-auto bg-white rounded-xl border border-gray-200 p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Feature not found</h1>
          <p className="text-gray-600 mt-3">This premium feature does not exist.</p>
          <Link to="/" className="inline-block mt-6 text-red-600 hover:underline">Back to workspace</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-xl border border-gray-200 p-8">
        <BackButton fallbackPath="/" />
        <p className="text-xs uppercase tracking-wide text-red-600 font-semibold">Premium Feature</p>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">{feature.title}</h1>
        <p className="text-gray-600 mt-4">{feature.description}</p>

        {feature.available ? (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 text-sm">
            This feature is active in your system. Use the action button below to continue.
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
            This feature page is now connected in the app, but full backend workflow is still pending.
          </div>
        )}

        <div className="mt-8 flex gap-4">
          <Link
            to={feature.path}
            className="inline-flex items-center rounded-lg px-5 py-3 text-white font-semibold"
            style={{ backgroundColor: '#DF0A0A' }}
          >
            {feature.cta}
          </Link>
          <Link to="/" className="inline-flex items-center rounded-lg px-5 py-3 border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50">
            Workspace
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PremiumFeatureDetail;
