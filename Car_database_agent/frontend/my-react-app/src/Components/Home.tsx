import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addCar } from "./api";
import { useToast } from "./ToastProvider";
import "./Components.css";

function Home() {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingCar, setPendingCar] = useState<{ brand: string; model: string; year: number } | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    const car = {
      brand: brand.trim(),
      model: model.trim(),
      year: Number(year),
    };

    setPendingCar(car);
  };

  const confirmAddCar = async () => {
    if (!pendingCar) return;

    const car = pendingCar;
    setPendingCar(null);
    setSubmitting(true);
    try {
      await addCar(car);
      toast.success(`${car.year} ${car.brand} ${car.model} added.`, {
        label: "View cars",
        onClick: () => navigate("/cars"),
      });
      setBrand("");
      setModel("");
      setYear("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add the car.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page page-narrow">
      <div className="page-header">
        <div>
          <h1>Add a car</h1>
          <p>Fill in the details and save them to your list.</p>
        </div>
      </div>

      <form className="panel" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="brand">Brand</label>
          <input
            id="brand"
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g. Toyota"
            autoComplete="off"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="model">Model</label>
            <input
              id="model"
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. Camry"
              autoComplete="off"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="year">Year</label>
            <input
              id="year"
              type="number"
              inputMode="numeric"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g. 2024"
              min="1900"
              max="2100"
              required
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? (
            <>
              <span className="btn-spinner" aria-hidden="true" />
              Saving…
            </>
          ) : (
            "Save car"
          )}
        </button>
      </form>

      {pendingCar && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setPendingCar(null);
          }}
        >
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="add-confirm-title">
            <div className="modal-kicker">Save car</div>
            <h2 id="add-confirm-title">Add this car?</h2>
            <p className="modal-copy">This car will be added to your saved list.</p>
            <pre className="modal-command">{pendingCar.year} {pendingCar.brand} {pendingCar.model}</pre>
            <div className="modal-actions">
              <button className="btn modal-cancel" type="button" onClick={() => setPendingCar(null)}>
                Cancel
              </button>
              <button className="btn modal-confirm" type="button" onClick={confirmAddCar}>
                Add car
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default Home;