/* eslint-disable react-hooks/refs */
/* eslint-disable react-hooks/set-state-in-effect */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { fetchCars, type Car } from "./api";
import "./Components.css";

interface LocationState {
  aiFilteredCars?: Car[] | null;
}

export const Databaseshow: React.FC = () => {
  const location = useLocation();

  // Capture any AI-filtered results passed via navigation state, but only
  // on the initial render -- we don't want later location updates (e.g.
  // from clearing the filter) to re-trigger this.
  const initialFiltered = useRef(
    (location.state as LocationState | null)?.aiFilteredCars ?? null
  ).current;

  const [cars, setCars] = useState<Car[]>(initialFiltered ?? []);
  const [loading, setLoading] = useState(initialFiltered === null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isFiltered, setIsFiltered] = useState(initialFiltered !== null);

  const loadCars = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCars(await fetchCars());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialFiltered === null) {
      loadCars();
    }
    // Clear the router's navigation state once consumed, so a page
    // refresh or using the back/forward buttons doesn't reapply a
    // stale AI filter.
    if (window.history.state?.usr) {
      window.history.replaceState({ ...window.history.state, usr: null }, "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showAllCars = () => {
    setIsFiltered(false);
    void loadCars();
  };

  const visibleCars = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cars;
    return cars.filter((c) =>
      `${c.brand} ${c.model} ${c.year}`.toLowerCase().includes(q)
    );
  }, [cars, query]);

  const subtitle = loading
    ? "Loading your cars…"
    : `${cars.length} ${cars.length === 1 ? "car" : "cars"} saved`;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>My cars</h1>
          <p>{subtitle}</p>
        </div>

        <div className="header-tools">
          <input
            type="search"
            className="search"
            placeholder="Search brand, model or year"
            aria-label="Search cars"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className="btn btn-secondary"
            onClick={() => {
              setIsFiltered(false);
              void loadCars();
            }}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {isFiltered && !loading && (
        <div className="panel" style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span>Showing results from your AI request.</span>
          <button className="btn btn-secondary" onClick={showAllCars}>
            Show all cars
          </button>
        </div>
      )}

      <div className="car-grid" aria-busy={loading}>
        {loading && cars.length === 0 &&
          Array.from({ length: 3 }).map((_, i) => <div className="skeleton" key={i} />)}

        {!loading && error && (
          <div className="state-box state-box-error" role="alert">
            <h2>Couldn't load your cars</h2>
            <p>{error}</p>
            <div className="state-actions">
              <button className="btn btn-primary" onClick={loadCars}>
                Try again
              </button>
            </div>
          </div>
        )}

        {!loading && !error && cars.length === 0 && (
          <div className="state-box">
            <h2>No cars yet</h2>
            <p>Add your first car by typing a prompt or filling in the form.</p>
            <div className="state-actions">
              <Link to="/prompt" className="btn btn-primary">✨ Ask AI</Link>
              <Link to="/add" className="btn btn-secondary">➕ Add manually</Link>
            </div>
          </div>
        )}

        {!loading && !error && cars.length > 0 && visibleCars.length === 0 && (
          <div className="state-box">
            <h2>No matches</h2>
            <p>Nothing matches “{query}”. Try a different brand, model or year.</p>
          </div>
        )}

        {!error &&
          visibleCars.map((car, index) => (
            <article className="car-card" key={car.id ?? index}>
              <div className="car-card-top">
                <div className="car-icon" aria-hidden="true">🚗</div>
                <h2>{car.brand}</h2>
              </div>
              <div className="car-detail">
                <span>Model</span>
                <strong>{car.model}</strong>
              </div>
              <div className="car-detail">
                <span>Year</span>
                <strong>{car.year}</strong>
              </div>
            </article>
          ))}
      </div>
    </div>
  );
};

export default Databaseshow;