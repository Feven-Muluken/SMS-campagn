import { useMemo, useState } from 'react';
import axios from '../api/axiosInstance';
import { toast } from 'sonner';
import BackButton from '../components/BackButton';
import { FiMapPin, FiSearch, FiSend, FiTarget } from 'react-icons/fi';

const placeToLabel = (place) => {
  if (!place) return '';
  const parts = [place.name, place.address?.city, place.address?.country].filter(Boolean);
  return parts.join(', ') || place.display_name || '';
};

const GeoMarketing = () => {
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

  const runPreview = async () => {
    if (!selectedPlace) {
      toast.error('Select a place first');
      return;
    }

    setLoadingPreview(true);
    try {
      const res = await axios.post('/sms/geo/preview', {
        centerLat: selectedPlace.lat,
        centerLng: selectedPlace.lon,
        radiusKm,
        placeName: selectedPlaceLabel,
      });
      setPreview(res.data);
      toast.success(`Found ${res.data.count} customer(s) in radius`);
    } catch (error) {
      console.error('Geo preview failed:', error);
      toast.error(error.response?.data?.message || 'Failed to preview audience');
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const sendGeoCampaign = async (e) => {
    e.preventDefault();
    if (!selectedPlace) return toast.error('Select a place first');
    if (!message.trim()) return toast.error('Message is required');

    setSending(true);
    try {
      const res = await axios.post('/sms/geo/send', {
        centerLat: selectedPlace.lat,
        centerLng: selectedPlace.lon,
        radiusKm,
        placeName: selectedPlaceLabel,
        message: message.trim(),
        senderId: senderId || undefined,
      });

      toast.success(`${res.data.successCount} SMS sent in ${selectedPlaceLabel}`);
      setMessage('');
      await runPreview();
    } catch (error) {
      console.error('Geo SMS failed:', error);
      toast.error(error.response?.data?.message || 'Failed to send geo SMS');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white px-6 py-8">
      <BackButton fallbackPath="/admin" />

      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900">Geo-SMS Marketing</h1>
        <p className="text-sm text-gray-600 mt-1">
          Search a real place (Addis Ababa, Ethiopia, or global), choose radius, then send SMS to customers located there.
        </p>

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

          <button
            type="button"
            onClick={runPreview}
            disabled={loadingPreview || !selectedPlace}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 inline-flex items-center gap-2 disabled:opacity-60"
          >
            <FiTarget /> {loadingPreview ? 'Checking...' : 'Preview Audience'}
          </button>

          {preview && (
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-900">Audience in radius: {preview.count}</p>
              {preview.contacts?.length > 0 ? (
                <div className="mt-2 space-y-1 text-sm text-gray-600 max-h-40 overflow-auto">
                  {preview.contacts.map((contact) => (
                    <div key={contact.id} className="flex justify-between gap-2 border-b border-gray-100 py-1.5 last:border-b-0">
                      <span>{contact.name || contact.phoneNumber}</span>
                      <span>{contact.distanceKm} km</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 mt-1">No matched contacts with saved coordinates.</p>
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
              <FiSend /> {sending ? 'Sending...' : 'Send Geo Campaign'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GeoMarketing;
