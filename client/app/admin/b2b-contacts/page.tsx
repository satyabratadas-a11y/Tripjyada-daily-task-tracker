'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import RoleGuard from '@/components/RoleGuard';
import type { Contact } from '@/lib/types';

export default function B2BContactsAdminPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Contact | null>(null);
  const [fullImage, setFullImage] = useState('');

  async function load(q?: string) {
    setLoading(true);
    setError('');
    try {
      const query = q ? `?q=${encodeURIComponent(q)}` : '';
      const { contacts } = await api.get<{ contacts: Contact[] }>(`/api/contacts${query}`);
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

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    load(search);
  }

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

  function agentName(c: Contact) {
    return typeof c.capturedBy === 'object' ? c.capturedBy.name : c.capturedBy;
  }

  function closeModal() {
    setSelected(null);
    setFullImage('');
  }

  return (
    <RoleGuard role="super_admin">
    <div>
      <h1 className="mb-1 text-lg font-semibold dark:text-gray-100">B2B contacts</h1>
      <p className="mb-4 text-sm text-gray-500">Business cards captured by all B2B agents.</p>

      <form onSubmit={handleSearchSubmit} className="mb-4 flex gap-2">
        <input
          className="input max-w-xs"
          placeholder="Search name or company…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn-secondary">
          Search
        </button>
      </form>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : contacts.length === 0 ? (
        <p className="text-sm text-gray-500">No contacts captured yet.</p>
      ) : (
        <>
          {/* Mobile: one card per contact */}
          <div className="space-y-3 sm:hidden">
            {contacts.map((c) => (
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

                {(c.phone || c.email) && (
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
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-user w-4 text-gray-400" />
                      <span>Captured by {agentName(c)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10 sm:block">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-white/5">
                  <th className="p-3">Name</th>
                  <th className="p-3">Company</th>
                  <th className="p-3">Phone / Email</th>
                  <th className="p-3">Captured by</th>
                  <th className="p-3">Date</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c._id} className="border-t border-gray-100 dark:border-white/10">
                    <td
                      className="cursor-pointer p-3 font-medium text-gray-900 dark:text-gray-100"
                      onClick={() => setSelected(c)}
                    >
                      {c.name || 'Unnamed'}
                    </td>
                    <td className="p-3 text-gray-600 dark:text-gray-300">{c.company}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-300">
                      {c.phone}
                      {c.phone && c.email ? ' / ' : ''}
                      {c.email}
                    </td>
                    <td className="p-3 text-gray-600 dark:text-gray-300">{agentName(c)}</td>
                    <td className="p-3 text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      <button type="button" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(c._id)}>
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
                {selected.imageUrl ? (
                  <>
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
                  </>
                ) : (
                  <div className="flex h-28 w-28 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 text-gray-400 dark:border-white/10">
                    <i className="fa-solid fa-address-card text-lg" />
                    <span className="text-[10px]">Entered manually</span>
                  </div>
                )}
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
                  <i className="fa-solid fa-user w-4 pt-0.5" />
                  <span>Captured by {agentName(selected)}</span>
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
    </RoleGuard>
  );
}
