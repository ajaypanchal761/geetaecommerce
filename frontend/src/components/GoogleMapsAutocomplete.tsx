import { useCallback, useEffect, useRef, useState } from 'react';

interface GoogleMapsAutocompleteProps {
  value: string;
  onChange: (address: string, lat: number, lng: number, placeName: string, components?: { city?: string; state?: string }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

// Google Maps types are now declared globally in types/googlemaps.d.ts
// We use window.google directly from the global namespace

// Clean address by removing Plus Codes and unwanted identifiers
const cleanAddress = (address: string): string => {
  if (!address) return address;

  const cleaned = address
    .replace(/^[A-Z0-9]{2,4}\+[A-Z0-9]{2,4}([,\s]+)?/i, '')
    .replace(/([,\s]+)?[A-Z0-9]{2,4}\+[A-Z0-9]{2,4}$/i, '')
    .replace(/([,\s]+)[A-Z0-9]{2,4}\+[A-Z0-9]{2,4}([,\s]+)/gi, (_match, before, after) => {
      return before.includes(',') || after.includes(',') ? ', ' : ' ';
    })
    .replace(/\s+[A-Z0-9]{2,4}\+[A-Z0-9]{2,4}\s+/gi, ' ')
    .replace(/\b[A-Z0-9]{2,4}\+[A-Z0-9]{2,4}\b/gi, '')
    .replace(/,\s*,+/g, ',')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim();

  return cleaned;
};

export default function GoogleMapsAutocomplete({
  value,
  onChange,
  placeholder = 'Search location...',
  className = '',
  disabled = false,
  required = false,
}: GoogleMapsAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string>('');
  const [inputValue, setInputValue] = useState(value);

  // Update local input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Initialize autocomplete using the legacy Autocomplete API
  // Note: The new PlaceAutocompleteElement is recommended for new customers from March 2025,
  // but it requires a different implementation pattern (Web Component).
  // For now, we continue using the legacy Autocomplete which still works for existing customers.
  const initializeAutocomplete = useCallback(() => {
    if (!inputRef.current || !window.google?.maps?.places) return;

    // Clean up any existing autocomplete
    if (autocompleteRef.current) {
      try {
        window.google?.maps?.event?.clearInstanceListeners?.(autocompleteRef.current);
      } catch {
        // Ignore cleanup errors
      }
      autocompleteRef.current = null;
    }

    try {
      const places = window.google.maps.places as any;

      if (!places.Autocomplete) {
        setError('Google Maps Places Autocomplete not available');
        return;
      }

      const autocomplete = new places.Autocomplete(inputRef.current, {
        types: ['establishment', 'geocode'],
        componentRestrictions: { country: 'in' },
        fields: ['address_components', 'formatted_address', 'geometry', 'name', 'place_id'],
      });

      autocompleteRef.current = autocomplete;

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();

        if (!place.geometry || !place.geometry.location) {
          setError('No location details found for this place');
          return;
        }

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const rawAddress = place.formatted_address || place.name || value;
        const address = cleanAddress(rawAddress);
        const placeName = place.name || address;

        let city = '';
        let state = '';

        if (place.address_components) {
          for (const component of place.address_components) {
            if (component.types.includes('locality')) {
              city = component.long_name;
            } else if (component.types.includes('administrative_area_level_3') && !city) {
              city = component.long_name;
            } else if (component.types.includes('administrative_area_level_1')) {
              state = component.long_name;
            }
          }
        }

        setInputValue(address);
        onChange(address, lat, lng, placeName, { city, state });
        setError('');
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Autocomplete initialization error:', err);
      setError(`Failed to initialize autocomplete: ${errorMessage}`);
    }
  }, [onChange, value]);

  // Load Google Maps API script with async loading
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setError('Google Maps API key is not configured');
      return;
    }

    // Check if API is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsLoaded(true);
      initializeAutocomplete();
      return;
    }

    // Check if script is already loading
    if (document.querySelector(`script[src*="maps.googleapis.com"]`)) {
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          clearInterval(checkInterval);
          setIsLoaded(true);
          initializeAutocomplete();
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    // Load the script with async loading as recommended by Google
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsLoaded(true);
      initializeAutocomplete();
    };
    script.onerror = () => {
      setError('Failed to load Google Maps API');
    };
    document.head.appendChild(script);

    return () => {
      if (autocompleteRef.current) {
        try {
          window.google?.maps?.event?.clearInstanceListeners?.(autocompleteRef.current);
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [initializeAutocomplete]);

  useEffect(() => {
    if (isLoaded && inputRef.current && !autocompleteRef.current) {
      initializeAutocomplete();
    }
  }, [isLoaded, value, initializeAutocomplete]);

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          onChange(e.target.value, 0, 0, e.target.value);
        }}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border border-neutral-300 rounded-lg placeholder:text-neutral-400 focus:outline-none focus:border-orange-500 bg-white ${className}`}
        disabled={disabled || !isLoaded}
        required={required}
        autoComplete="off"
      />
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
      {!isLoaded && !error && (
        <p className="mt-1 text-xs text-neutral-500">Loading location services...</p>
      )}
    </div>
  );
}



