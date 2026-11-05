"use client";

import { useState } from "react";

interface DetailItem {
  label: string;
  value: string | number | null | undefined;
}

interface PropertyAccordionProps {
  locationItems: DetailItem[];
  specificationItems: DetailItem[];
}

export function PropertyAccordion({
  locationItems,
  specificationItems,
}: PropertyAccordionProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Filter out any empty values — "yg muncul yg ada aja datanya"
  const validLocation = locationItems.filter(
    (item) => item.value !== null && item.value !== undefined && item.value !== ""
  );
  const validSpecs = specificationItems.filter(
    (item) => item.value !== null && item.value !== undefined && item.value !== ""
  );

  if (validLocation.length === 0 && validSpecs.length === 0) {
    return null;
  }

  return (
    <div className="pd-info-section">
      <h2 className="pd-info-title">Property Information</h2>

      <div className="pd-details-accordion">
        <button
          type="button"
          className="pd-accordion-header"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
        >
          <span>Property Details</span>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={`pd-chevron ${isOpen ? "open" : ""}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {isOpen && (
          <div className="pd-accordion-panel">
            {/* Location Section */}
            {validLocation.length > 0 && (
              <div className="pd-panel-group">
                <h3 className="pd-group-heading">Location</h3>
                <div className="pd-kv-grid">
                  {validLocation.map((item, index) => (
                    <div key={index} className="pd-kv-item">
                      <span className="pd-kv-key">{item.label}</span>
                      <span className="pd-kv-val">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Features Section */}
            {validSpecs.length > 0 && (
              <div className="pd-panel-group">
                <h3 className="pd-group-heading">Property Features</h3>
                <div className="pd-kv-grid">
                  {validSpecs.map((item, index) => (
                    <div key={index} className="pd-kv-item">
                      <span className="pd-kv-key">{item.label}</span>
                      <span className="pd-kv-val">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
