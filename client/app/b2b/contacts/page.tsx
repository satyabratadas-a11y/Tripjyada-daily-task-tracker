'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, ApiError, downloadUrl } from '@/lib/api';
import type { Contact } from '@/lib/types';

export default function MyContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Contact | null>(null);
  const [fullImage, setFullImage] = useState('');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (dateFilter && new Date(c.createdAt).toISOString().slice(0, 10) !== dateFilter) return false;
      if (!q) return true;
      return [c.name, c.company, c.phone, c.email, c.address].some((field) => field?.toLowerCase().includes(q));
    });
  }, [contacts, search, dateFilter]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { contacts } = await api.get<{ contacts: Contact[] }>('/api/contacts/mine');
      setContacts(contacts);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this contact? This cannot be undone.')) return;
    try {
      await api.delete(`/api/contacts/${id}`);
      setContacts((prev) => prev.filter((c) => c._id !== id));
      if (selected?._id === id) setSelected(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete contact');
    }
  }

  function closeModal() {
    setSelected(null);
    setFullImage('');
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold dark:text-gray-100">My contacts</h1>
        <a href={downloadUrl('/api/contacts/mine/export')} className="btn-secondary text-xs">
          <i className="fa-solid fa-file-excel" /> Download Excel
        </a>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="input max-w-xs text-sm"
          placeholder="Search name, phone, company, address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          type="date"
          className="input max-w-[10rem] text-sm"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
        {(search || dateFilter) && (
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => {
              setSearch('');
              setDateFilter('');
            }}
          >
            Clear
          </button>
        )}
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : contacts.length === 0 ? (
        <p className="text-sm text-gray-500">No contacts saved yet — scan a card to get started.</p>
      ) : filteredContacts.length === 0 ? (
        <p className="text-sm text-gray-500">No contacts match your filters.</p>
      ) : (
        <>
          {/* Mobile: one card per contact */}
          <div className="space-y-3 sm:hidden">
            {filteredContacts.map((c) => (
              <div key={c._id} className="card cursor-pointer" onClick={() => setSelected(c)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900 dark:text-gray-100">{c.name || 'Unnamed'}</p>
                    {c.company && <p className="truncate text-sm text-gray-500">{c.company}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                    <button
                      type="button"
                      className="text-red-500 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(c._id);
                      }}
                      aria-label="Delete contact"
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                </div>

                {(c.phone || c.email || c.address) && (
                  <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3 text-sm text-gray-600 dark:border-white/10 dark:text-gray-300">
                    {c.phone && (
                      <div className="flex items-center gap-2">
                        <i className="fa-solid fa-phone w-4 text-gray-400" />
                        <span>{c.phone}</span>
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center gap-2">
                        <i className="fa-solid fa-envelope w-4 text-gray-400" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    )}
                    {c.address && (
                      <div className="flex items-start gap-2">
                        <i className="fa-solid fa-location-dot w-4 pt-0.5 text-gray-400" />
                        <span>{c.address}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10 sm:block">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500 dark:bg-white/5">
                  <th className="p-2">Date</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Company</th>
                  <th className="p-2">Phone</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Address</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((c) => (
                  <tr
                    key={c._id}
                    className="cursor-pointer border-t border-gray-100 align-top dark:border-white/10"
                    onClick={() => setSelected(c)}
                  >
                    <td className="whitespace-nowrap p-2 text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="p-2 font-medium text-gray-900 dark:text-gray-100">{c.name || 'Unnamed'}</td>
                    <td className="p-2 text-gray-600 dark:text-gray-300">{c.company}</td>
                    <td className="whitespace-nowrap p-2 text-gray-600 dark:text-gray-300">{c.phone}</td>
                    <td className="p-2 text-gray-600 dark:text-gray-300">{c.email}</td>
                    <td className="p-2 text-gray-600 dark:text-gray-300">{c.address}</td>
                    <td className="p-2">
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(c._id);
                        }}
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeModal}>
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-ink-light"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-white/10">
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selected.name || 'Unnamed'}</p>
                <p className="text-sm text-gray-500">{[selected.jobTitle, selected.company].filter(Boolean).join(' · ')}</p>
              </div>
              <button type="button" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" onClick={closeModal} aria-label="Close">
                <i className="fa-solid fa-xmark text-lg" />
              </button>
            </div>

            {/* overflow-y-auto here is a safety net for unusually long content (e.g. a long notes
               field) — thumbnails are small below so a normal card never triggers it. */}
            <div className="grid grid-cols-1 gap-5 overflow-y-auto p-5 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs text-gray-500">Click a photo to view full size</p>
                <div className="flex gap-3">
                  <img
                    src={selected.imageUrl}
                    alt={selected.name || 'Business card'}
                    className="h-28 w-28 cursor-pointer rounded-lg border border-gray-200 object-cover transition hover:opacity-80 dark:border-white/10"
                    onClick={() => setFullImage(selected.imageUrl)}
                  />
                  {selected.backImageUrl && (
                    <img
                      src={selected.backImageUrl}
                      alt="Back of business card"
                      className="h-28 w-28 cursor-pointer rounded-lg border border-gray-200 object-cover transition hover:opacity-80 dark:border-white/10"
                      onClick={() => setFullImage(selected.backImageUrl)}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {selected.phone && (
                  <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <i className="fa-solid fa-phone w-4 pt-0.5 text-gray-400" />
                    <span>{selected.phone}</span>
                  </div>
                )}
                {selected.email && (
                  <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <i className="fa-solid fa-envelope w-4 pt-0.5 text-gray-400" />
                    <span>{selected.email}</span>
                  </div>
                )}
                {selected.website && (
                  <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <i className="fa-solid fa-globe w-4 pt-0.5 text-gray-400" />
                    <span>{selected.website}</span>
                  </div>
                )}
                {selected.address && (
                  <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <i className="fa-solid fa-location-dot w-4 pt-0.5 text-gray-400" />
                    <span>{selected.address}</span>
                  </div>
                )}
                {selected.notes && (
                  <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <i className="fa-solid fa-note-sticky w-4 pt-0.5 text-gray-400" />
                    <span>{selected.notes}</span>
                  </div>
                )}
                <div className="flex items-start gap-3 text-xs text-gray-400">
                  <i className="fa-solid fa-clock w-4 pt-0.5" />
                  <span>{new Date(selected.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-gray-200 px-5 py-3 dark:border-white/10">
              <button type="button" className="btn-secondary" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {fullImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setFullImage('')}
        >
          <button
            type="button"
            className="absolute right-4 top-4 text-white/80 hover:text-white"
            onClick={() => setFullImage('')}
            aria-label="Close full-size image"
          >
            <i className="fa-solid fa-xmark text-2xl" />
          </button>
          <img src={fullImage} alt="Business card, full size" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}
