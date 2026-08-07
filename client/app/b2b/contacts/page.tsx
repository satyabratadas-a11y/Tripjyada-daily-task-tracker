'use client';

import { useEffect, useState } from 'react';
import { api, ApiError, downloadUrl } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { splitContactValues, formatFullAddress } from '@/lib/contactFormat';
import { cloudinaryThumb, cloudinaryOptimized } from '@/lib/cloudinaryUrl';
import type { Contact } from '@/lib/types';

function agentName(c: Contact) {
  return typeof c.capturedBy === 'object' ? c.capturedBy.name : '';
}

function agentId(c: Contact) {
  return typeof c.capturedBy === 'object' ? c.capturedBy._id : c.capturedBy;
}

interface Agent {
  id: string;
  name: string;
}

function MultiValue({ value }: { value?: string }) {
  const parts = splitContactValues(value);
  if (parts.length === 0) return null;
  return (
    <>
      {parts.map((part, i) => (
        <div key={i}>{part}</div>
      ))}
    </>
  );
}

const PAGE_SIZE = 25;

export default function MyContactsPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Contact | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [fullImage, setFullImage] = useState('');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);

  function isOwn(c: Contact) {
    return agentId(c) === user?.id;
  }

  // Distinct list of agents who've actually captured a contact — used for the "filter/download by
  // employee" picker. Loaded once; the shared contact pool doesn't need this to stay live-updated
  // within a single visit to the page.
  useEffect(() => {
    api
      .get<{ agents: Agent[] }>('/api/contacts/agents')
      .then(({ agents: list }) => setAgents(list))
      .catch(() => {
        // Non-fatal — the employee filter just won't have options; search/date filtering still works.
      });
  }, []);

  function exportParams() {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (dateFilter) params.set('date', dateFilter);
    if (agentFilter) params.set('agentId', agentFilter);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  async function load(q: string, date: string, agent: string, pageNum: number, append: boolean) {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(pageNum), limit: String(PAGE_SIZE) });
      if (q) params.set('q', q);
      if (date) params.set('date', date);
      if (agent) params.set('agentId', agent);
      const { contacts: newContacts, hasMore: more } = await api.get<{ contacts: Contact[]; hasMore: boolean }>(
        `/api/contacts?${params.toString()}`
      );
      setContacts((prev) => (append ? [...prev, ...newContacts] : newContacts));
      setHasMore(more);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load contacts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  // Search/date/agent changes reset to page 1 and re-query the server (rather than filtering the
  // already loaded page) — otherwise typing a search term would only ever search within whatever
  // page "Load more" had reached so far. Debounced so each keystroke doesn't fire its own request.
  useEffect(() => {
    const handle = setTimeout(() => {
      load(search, dateFilter, agentFilter, 1, false);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, dateFilter, agentFilter]);

  function handleLoadMore() {
    load(search, dateFilter, agentFilter, page + 1, true);
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

  // The list response omits photos (see contact.controller.js listAll) to keep it fast, so opening
  // a row fetches the full record on demand rather than reading photos off the already-loaded row.
  async function openContact(c: Contact) {
    setSelected(c);
    setDetailLoading(true);
    try {
      const { contact } = await api.get<{ contact: Contact }>(`/api/contacts/${c._id}`);
      setSelected(contact);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load contact details');
    } finally {
      setDetailLoading(false);
    }
  }

  function closeModal() {
    setSelected(null);
    setFullImage('');
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">B2B contacts</h1>
          <p className="text-sm text-gray-500">Business cards captured by every B2B agent — shared, not just your own.</p>
        </div>
        <a href={downloadUrl(`/api/contacts/export${exportParams()}`)} className="btn-secondary text-xs">
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
        <select
          className="input max-w-[12rem] text-sm"
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
        >
          <option value="">All employees</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        {(search || dateFilter || agentFilter) && (
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => {
              setSearch('');
              setDateFilter('');
              setAgentFilter('');
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
        <p className="text-sm text-gray-500">
          {search || dateFilter || agentFilter
            ? 'No contacts match your filters.'
            : 'No contacts saved yet — scan a card to get started.'}
        </p>
      ) : (
        <>
          {/* Mobile: one card per contact */}
          <div className="space-y-3 sm:hidden">
            {contacts.map((c) => (
              <div key={c._id} className="card cursor-pointer" onClick={() => openContact(c)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900 dark:text-gray-100">{c.name || 'Unnamed'}</p>
                    {c.company && <p className="truncate text-sm text-gray-500">{c.company}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                    {isOwn(c) && (
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
                    )}
                  </div>
                </div>

                {(c.phone || c.email || c.address) && (
                  <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3 text-sm text-gray-600 dark:border-white/10 dark:text-gray-300">
                    {splitContactValues(c.phone).map((phone, i) => (
                      <div key={`phone-${i}`} className="flex items-center gap-2">
                        <i className="fa-solid fa-phone w-4 text-gray-400" />
                        <span>{phone}</span>
                      </div>
                    ))}
                    {splitContactValues(c.email).map((email, i) => (
                      <div key={`email-${i}`} className="flex items-center gap-2">
                        <i className="fa-solid fa-envelope w-4 text-gray-400" />
                        <span className="truncate">{email}</span>
                      </div>
                    ))}
                    {c.address && (
                      <div className="flex items-start gap-2">
                        <i className="fa-solid fa-location-dot w-4 pt-0.5 text-gray-400" />
                        <span>{formatFullAddress(c.address, c.state, c.pincode)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-user w-4 text-gray-400" />
                      <span>{isOwn(c) ? 'Captured by you' : `Captured by ${agentName(c)}`}</span>
                    </div>
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
                  <th className="p-2">Captured by</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr
                    key={c._id}
                    className="cursor-pointer border-t border-gray-100 align-top dark:border-white/10"
                    onClick={() => openContact(c)}
                  >
                    <td className="whitespace-nowrap p-2 text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="p-2 font-medium text-gray-900 dark:text-gray-100">{c.name || 'Unnamed'}</td>
                    <td className="p-2 text-gray-600 dark:text-gray-300">{c.company}</td>
                    <td className="whitespace-nowrap p-2 text-gray-600 dark:text-gray-300">
                      <MultiValue value={c.phone} />
                    </td>
                    <td className="p-2 text-gray-600 dark:text-gray-300">
                      <MultiValue value={c.email} />
                    </td>
                    <td className="p-2 text-gray-600 dark:text-gray-300">{formatFullAddress(c.address, c.state, c.pincode)}</td>
                    <td className="p-2 text-gray-600 dark:text-gray-300">{isOwn(c) ? 'You' : agentName(c)}</td>
                    <td className="p-2">
                      {isOwn(c) && (
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
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="mt-4 flex justify-center">
              <button type="button" className="btn-secondary" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
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
                {detailLoading ? (
                  <div className="flex h-28 w-28 items-center justify-center rounded-lg border border-dashed border-gray-300 text-gray-400 dark:border-white/10">
                    <i className="fa-solid fa-spinner fa-spin" />
                  </div>
                ) : selected.imageUrl ? (
                  <>
                    <p className="mb-2 text-xs text-gray-500">Click a photo to view full size</p>
                    <div className="flex gap-3">
                      <img
                        src={cloudinaryThumb(selected.imageUrl, 112)}
                        alt={selected.name || 'Business card'}
                        className="h-28 w-28 cursor-pointer rounded-lg border border-gray-200 object-cover transition hover:opacity-80 dark:border-white/10"
                        onClick={() => setFullImage(selected.imageUrl || '')}
                      />
                      {selected.backImageUrl && (
                        <img
                          src={cloudinaryThumb(selected.backImageUrl, 112)}
                          alt="Back of business card"
                          className="h-28 w-28 cursor-pointer rounded-lg border border-gray-200 object-cover transition hover:opacity-80 dark:border-white/10"
                          onClick={() => setFullImage(selected.backImageUrl || '')}
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
                {splitContactValues(selected.phone).map((phone, i) => (
                  <div key={`phone-${i}`} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <i className="fa-solid fa-phone w-4 pt-0.5 text-gray-400" />
                    <span>{phone}</span>
                  </div>
                ))}
                {splitContactValues(selected.email).map((email, i) => (
                  <div key={`email-${i}`} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <i className="fa-solid fa-envelope w-4 pt-0.5 text-gray-400" />
                    <span>{email}</span>
                  </div>
                ))}
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
                {(selected.state || selected.pincode) && (
                  <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <i className="fa-solid fa-map w-4 pt-0.5 text-gray-400" />
                    <span>{[selected.state, selected.pincode].filter(Boolean).join(' - ')}</span>
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
                  <span>Captured by {isOwn(selected) ? 'you' : agentName(selected)}</span>
                </div>
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
          <img src={cloudinaryOptimized(fullImage)} alt="Business card, full size" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}
