import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from '../api/axiosInstance';
import { toast } from 'sonner';
import BackButton from '../components/BackButton';
import { useUser } from '../context/UserContext';
import { FiMapPin, FiSearch, FiSend, FiTarget } from 'react-icons/fi';

const placeToLabel = (place) => {
  if (!place) return '';
  const parts = [place.name, place.address?.city, place.address?.country].filter(Boolean);
  return parts.join(', ') || place.display_name || '';
};

const GeoMarketing = () => {
  const { user } = useUser();
  const isAdmin = (user?.role || '').toLowerCase() === 'admin';

  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [senderId, setSenderId] = useState('');
  const [message, setMessage] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [includeSavedAddresses, setIncludeSavedAddresses] = useState(false);
  const [openLiveAudience, setOpenLiveAudience] = useState(false);

  const selectedPlaceLabel = useMemo(() => placeToLabel(selectedPlace), [selectedPlace]);

  const searchPlaces = async () => {
    if (!query.trim()) {
      toast.error('Search for a place first');
      return;
    }

    setSearchingPlaces(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&q=${encodeURIComponent(query.trim())}`
      );
      const data = await res.json();
      const mapped = Array.isArray(data)
        ? data.map((row) => ({
            id: row.place_id,
            name: row.name || row.display_name,
            display_name: row.display_name,
            address: row.address || {},
            lat: Number(row.lat),
            lon: Number(row.lon),
          }))
        : [];
      setPlaces(mapped);
      if (!mapped.length) toast.error('No places found. Try a different place name.');
    } catch (error) {
      console.error('Place search failed:', error);
      toast.error('Place search failed');
    } finally {
      setSearchingPlaces(false);
    }
  };

  const geoRequestBody = useCallback(() => {
    const geoSources = ['live'];
    if (includeSavedAddresses) geoSources.push('saved');
    const body = {
      centerLat: selectedPlace.lat,
      centerLng: selectedPlace.lon,
      radiusKm,
      placeName: selectedPlaceLabel,
      geoSources,
    };
    if (isAdmin && openLiveAudience) body.openLiveAudience = true;
    return body;
  }, [selectedPlace, radiusKm, selectedPlaceLabel, includeSavedAddresses, openLiveAudience, isAdmin]);

  const runPreview = useCallback(
    async (opts = {}) => {
      const silent = Boolean(opts.silent);
      if (!selectedPlace) {
        if (!silent) toast.error('Select a place first');
        return;
      }

      setLoadingPreview(true);
      try {
        const res = await axios.post('/sms/geo/preview', geoRequestBody());
        setPreview(res.data);
        if (!silent) {
          const src = res.data.geoSources;
          const parts = [];
          if (src?.live) parts.push('live GPS');
          if (src?.saved) parts.push('saved addresses');
          toast.success(`${res.data.count} in radius (${parts.join(' + ') || '—'})`);
        }
      } catch (error) {
        console.error('Geo preview failed:', error);
        if (!silent) toast.error(error.response?.data?.message || 'Failed to preview audience');
        setPreview(null);
      } finally {
        setLoadingPreview(false);
      }
    },
    [selectedPlace, geoRequestBody]
  );

  useEffect(() => {
    if (!selectedPlace) {
      setPreview(null);
      return undefined;
    }
    const id = setTimeout(() => {
      void runPreview({ silent: true });
    }, 450);
    return () => clearTimeout(id);
  }, [selectedPlace, radiusKm, selectedPlaceLabel, includeSavedAddresses, openLiveAudience, isAdmin, runPreview]);

  const sendGeoCampaign = async (e) => {
    e.preventDefault();
    if (!selectedPlace) return toast.error('Select a place first');
    if (!message.trim()) return toast.error('Message is required');

    setSending(true);
    try {
      const res = await axios.post('/sms/geo/send', {
        ...geoRequestBody(),
        message: message.trim(),
        senderId: senderId || undefined,
      });

      toast.success(
        `${res.data.successCount} of ${res.data.total} SMS sent near ${selectedPlaceLabel} (${res.data.failCount || 0} failed)`
      );
      setMessage('');
      await runPreview({ silent: true });
    } catch (error) {
      console.error('Geo SMS failed:', error);
      toast.error(error.response?.data?.message || 'Failed to send geo SMS');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white px-6 py-8">
      <BackButton fallbackPath="/" />

      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900">Geo-SMS Marketing</h1>
        <p className="text-sm text-gray-600 mt-1 max-w-3xl">
          Choose a <strong>center point</strong> and <strong>radius</strong>. By default we use <strong>live GPS</strong> from your mobile app: the app posts the
          user&apos;s current coordinates (no need to save lat/lng on the contact first). Optionally mix in{' '}
          <strong>saved contact addresses</strong> from the database.
        </p>
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 space-y-2">
          <p className="font-medium">How live GPS works</p>
          <ul className="list-disc pl-5 space-y-1 text-emerald-900">
            <li>
              Your app calls <code className="text-xs bg-white/80 px-1 rounded">POST /sms/live-location/ping</code> with header{' '}
              <code className="text-xs bg-white/80 px-1 rounded">X-Live-Location-Key</code> (same value as <code className="text-xs bg-white/80 px-1 rounded">LIVE_LOCATION_INGEST_KEY</code> on the server) and body{' '}
              <code className="text-xs bg-white/80 px-1 rounded">phoneNumber</code>, <code className="text-xs bg-white/80 px-1 rounded">latitude</code>, <code className="text-xs bg-white/80 px-1 rounded">longitude</code>.
            </li>
            <li>
              <strong>Staff:</strong> only pings from phone numbers that exist as <em>your</em> contacts are eligible (contact record still needed for the number—no saved map pin required).
            </li>
            <li>
              <strong>Admin:</strong> optional &quot;open live audience&quot; includes recent pings even if the number is not in CRM (use carefully).
            </li>
            <li>Pings older than the server window (default 15 minutes, <code className="text-xs bg-white/80 px-1 rounded">LIVE_LOCATION_MAX_AGE_MINUTES</code>) are ignored.</li>
          </ul>
        </div>

        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Place</label>
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Bole, Addis Ababa OR Nairobi CBD"
                className="flex-1 border rounded-lg p-2"
              />
              <button
                type="button"
                onClick={searchPlaces}
                disabled={searchingPlaces}
                className="px-4 rounded-lg text-white inline-flex items-center gap-2"
                style={{ backgroundColor: '#DF0A0A' }}
              >
                <FiSearch /> {searchingPlaces ? 'Searching...' : 'Search'}
              </button>
            </div>

            {places.length > 0 && (
              <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
                {places.map((place) => {
                  const chosen = selectedPlace?.id === place.id;
                  return (
                    <button
                      key={place.id}
                      type="button"
                      onClick={() => setSelectedPlace(place)}
                      className={`w-full text-left p-3 border-b last:border-b-0 hover:bg-gray-50 ${chosen ? 'bg-red-50' : 'bg-white'}`}
                    >
                      <p className="text-sm font-medium text-gray-900">{placeToLabel(place)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {place.lat.toFixed(5)}, {place.lon.toFixed(5)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedPlace && (
            <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-gray-800">
              <p className="font-medium inline-flex items-center gap-2">
                <FiMapPin className="text-red-600" /> Selected: {selectedPlaceLabel}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Radius ({radiusKm} km)</label>
            <input
              type="range"
              min="1"
              max="100"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSavedAddresses}
                onChange={(e) => setIncludeSavedAddresses(e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="font-medium text-gray-800">Also include saved contact addresses</span>
                <span className="block text-gray-600 text-xs mt-0.5">
                  Uses Contacts → location coordinates in addition to live pings (merged, de-duplicated by phone).
                </span>
              </span>
            </label>
            {isAdmin ? (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={openLiveAudience}
                  onChange={(e) => setOpenLiveAudience(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="font-medium text-gray-800">Admin: open live audience</span>
                  <span className="block text-gray-600 text-xs mt-0.5">
                    Send to any recent GPS ping in the radius, even if the phone number is not a contact.
                  </span>
                </span>
              </label>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => runPreview()}
            disabled={loadingPreview || !selectedPlace}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 inline-flex items-center gap-2 disabled:opacity-60"
          >
            <FiTarget /> {loadingPreview ? 'Checking...' : 'Refresh audience'}
          </button>
          <p className="text-xs text-gray-500 -mt-2">
            Audience updates automatically when you change place or radius; use refresh if you need to reload counts.
          </p>

          {preview && (
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-900">Recipients in radius: {preview.count}</p>
              {preview.liveMaxAgeMinutes != null ? (
                <p className="text-xs text-gray-500 mt-1">Live pings must be newer than ~{preview.liveMaxAgeMinutes} minutes.</p>
              ) : null}
              {preview.contacts?.length > 0 ? (
                <div className="mt-2 space-y-1 text-sm text-gray-600 max-h-40 overflow-auto">
                  {preview.contacts.map((contact, idx) => (
                    <div
                      key={`${contact.phoneNumber}-${contact.source}-${idx}`}
                      className="flex justify-between gap-2 border-b border-gray-100 py-1.5 last:border-b-0"
                    >
                      <span>
                        {contact.name || contact.phoneNumber}
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-400">{contact.source}</span>
                      </span>
                      <span>{contact.distanceKm} km</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  No matches. Ensure the app is posting live location, or enable saved addresses, or widen the radius.
                </p>
              )}
            </div>
          )}

          <form onSubmit={sendGeoCampaign} className="space-y-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sender ID (optional)</label>
              <input
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                className="w-full border rounded-lg p-2"
                placeholder="AFROEL"
                maxLength={11}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full border rounded-lg p-2"
                rows={5}
                required
              />
            </div>

            <button
              disabled={sending || !selectedPlace}
              className="px-5 py-2 rounded-lg text-white inline-flex items-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: '#DF0A0A' }}
            >
              <FiSend /> {sending ? 'Sending...' : 'Send now to contacts in area'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GeoMarketing;
