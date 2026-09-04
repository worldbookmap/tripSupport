'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Building2, Globe2, LayoutGrid, Loader2, MapPin, Search, UtensilsCrossed } from 'lucide-react';
import type { BookRecord, Location } from '@/lib/types';
import { REGION_COLORS } from '@/lib/regions';
import { CATEGORY_COLORS, CATEGORY_LABELS, type Category } from '@/lib/category';

type Tab = 'country' | 'places' | 'books';
type PlaceFilter = 'all' | Category;

const TABS: { id: Tab; label: string; icon: typeof Globe2 }[] = [
  { id: 'country', label: '나라 > 도시', icon: Globe2 },
  { id: 'places', label: '장소', icon: MapPin },
  { id: 'books', label: '도서', icon: BookOpen },
];

const PLACE_FILTERS: { id: PlaceFilter; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'all', label: '전체', icon: LayoutGrid },
  { id: 'general', label: CATEGORY_LABELS.general, icon: MapPin },
  { id: 'food', label: CATEGORY_LABELS.food, icon: UtensilsCrossed },
];

const UNSPECIFIED = '미분류';

function matchesLocation(loc: Location, term: string) {
  return (
    loc.name.toLowerCase().includes(term) ||
    loc.country.toLowerCase().includes(term) ||
    loc.city.toLowerCase().includes(term) ||
    loc.district.toLowerCase().includes(term) ||
    loc.address.toLowerCase().includes(term) ||
    loc.history.toLowerCase().includes(term) ||
    loc.tourist_info.toLowerCase().includes(term)
  );
}

function matchesBook(book: BookRecord, term: string) {
  return (
    book.title.toLowerCase().includes(term) ||
    book.description.toLowerCase().includes(term) ||
    book.authors.some((a) => a.name.toLowerCase().includes(term)) ||
    (book.location?.name.toLowerCase().includes(term) ?? false)
  );
}

function LocationCard({ loc }: { loc: Location }) {
  const colors = REGION_COLORS[loc.region] ?? REGION_COLORS['기타'];
  const category = loc.category ?? 'general';
  const categoryColors = CATEGORY_COLORS[category];
  const CategoryIcon = category === 'food' ? UtensilsCrossed : MapPin;
  return (
    <Link
      href={`/timeline?locationId=${loc.id}`}
      className="block rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 transition-colors hover:border-accent/40 hover:bg-white/[0.05]"
    >
      <div className="mb-1 flex items-center gap-2">
        <CategoryIcon className="h-3.5 w-3.5 shrink-0" style={{ color: categoryColors.dot }} strokeWidth={2.25} />
        <span className="truncate text-sm font-medium text-zinc-100">{loc.name}</span>
        <span
          className="ml-auto shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium"
          style={{ borderColor: categoryColors.border, background: categoryColors.bg, color: categoryColors.text }}
        >
          {CATEGORY_LABELS[category]}
        </span>
        <span
          className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium"
          style={{ borderColor: colors.border, background: colors.bg, color: colors.text }}
        >
          {loc.region}
        </span>
      </div>
      {(loc.country || loc.city || loc.district) && (
        <p className="mb-1 truncate text-xs text-zinc-500">
          {[loc.country, loc.city, loc.district].filter(Boolean).join(' · ')}
        </p>
      )}
      {loc.address && <p className="mb-1 truncate text-[11px] text-zinc-600">{loc.address}</p>}
      {loc.history && <p className="line-clamp-2 text-xs leading-relaxed text-zinc-400">{loc.history}</p>}
    </Link>
  );
}

function BookCard({ book }: { book: BookRecord }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
      {book.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.thumbnail_url}
          alt=""
          className="h-14 w-10 shrink-0 rounded-sm object-cover shadow-sm ring-1 ring-white/[0.08]"
        />
      ) : (
        <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded-sm bg-white/[0.06] ring-1 ring-white/[0.08]">
          <BookOpen className="h-4 w-4 text-zinc-600" strokeWidth={2} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100">{book.title}</p>
        <p className="truncate text-xs text-zinc-500">
          {book.authors.map((a) => a.name).join(', ') || '작가 정보 없음'}
        </p>
        {book.location && (
          <Link
            href={`/timeline?locationId=${book.location.id}`}
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-accent-strong hover:underline"
          >
            <MapPin className="h-3 w-3" strokeWidth={2.25} />
            {book.location.name}
          </Link>
        )}
      </div>
    </div>
  );
}

export function RecordsView() {
  const [tab, setTab] = useState<Tab>('country');
  const [placeFilter, setPlaceFilter] = useState<PlaceFilter>('all');
  const [search, setSearch] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [locRes, bookRes] = await Promise.all([fetch('/api/locations'), fetch('/api/books')]);
        if (locRes.ok) setLocations(await locRes.json());
        if (bookRes.ok) setBooks(await bookRes.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const term = search.trim().toLowerCase();

  const filteredLocations = useMemo(
    () => (term ? locations.filter((loc) => matchesLocation(loc, term)) : locations),
    [locations, term]
  );

  const filteredBooks = useMemo(() => (term ? books.filter((b) => matchesBook(b, term)) : books), [books, term]);

  const filteredPlaces = useMemo(
    () =>
      placeFilter === 'all' ? filteredLocations : filteredLocations.filter((loc) => (loc.category ?? 'general') === placeFilter),
    [filteredLocations, placeFilter]
  );

  const countryTree = useMemo(() => {
    const map = new Map<string, Map<string, Location[]>>();
    for (const loc of filteredLocations) {
      const country = loc.country || UNSPECIFIED;
      const city = loc.city || UNSPECIFIED;
      if (!map.has(country)) map.set(country, new Map());
      const cityMap = map.get(country)!;
      if (!cityMap.has(city)) cityMap.set(city, []);
      cityMap.get(city)!.push(loc);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'ko'));
  }, [filteredLocations]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-1 text-lg font-semibold text-zinc-50">기록</h1>
      <p className="mb-5 text-sm text-zinc-500">저장한 지역, 도서를 모아서 살펴보세요.</p>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-medium transition-colors ${
                active
                  ? 'border-accent/40 bg-accent/15 text-accent-strong'
                  : 'border-white/[0.06] bg-white/[0.03] text-zinc-500 hover:text-zinc-200'
              }`}
            >
              <Icon className="h-4.5 w-4.5" strokeWidth={2.25} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-accent-strong" strokeWidth={2.5} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tab === 'books' ? '책 제목, 작가로 검색' : '지역, 나라, 도시로 검색'}
          className="w-full rounded-xl border border-white/[0.08] bg-black/30 py-2.5 pl-9 pr-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-10 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} />
          불러오는 중...
        </div>
      )}

      {!loading && tab === 'country' && (
        <>
          {countryTree.length === 0 && <p className="py-10 text-center text-sm text-zinc-500">검색 결과가 없어요.</p>}
          {countryTree.map(([country, cityMap]) => (
            <div key={country} className="mb-6">
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-zinc-200">
                <Globe2 className="h-4 w-4 text-accent-strong" strokeWidth={2.25} />
                {country}
              </h2>
              <div className="ml-1.5 space-y-4 border-l border-white/[0.06] pl-4">
                {Array.from(cityMap.entries()).map(([city, locs]) => (
                  <div key={city}>
                    <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                      <Building2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                      {city}
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {locs.map((loc) => (
                        <LocationCard key={loc.id} loc={loc} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {!loading && tab === 'places' && (
        <>
          <div className="mb-4 flex gap-1.5">
            {PLACE_FILTERS.map((f) => {
              const active = placeFilter === f.id;
              const colors = f.id === 'all' ? null : CATEGORY_COLORS[f.id];
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  onClick={() => setPlaceFilter(f.id)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                    active && !colors
                      ? 'border-accent/40 bg-accent/15 text-accent-strong'
                      : !active
                        ? 'border-white/[0.06] bg-white/[0.03] text-zinc-500 hover:text-zinc-200'
                        : ''
                  }`}
                  style={active && colors ? { borderColor: colors.border, background: colors.bg, color: colors.text } : undefined}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.25} style={active && colors ? { color: colors.dot } : undefined} />
                  {f.label}
                </button>
              );
            })}
          </div>
          {filteredPlaces.length === 0 && (
            <p className="py-10 text-center text-sm text-zinc-500">검색 결과가 없어요.</p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {filteredPlaces.map((loc) => (
              <LocationCard key={loc.id} loc={loc} />
            ))}
          </div>
        </>
      )}

      {!loading && tab === 'books' && (
        <>
          {filteredBooks.length === 0 && <p className="py-10 text-center text-sm text-zinc-500">검색 결과가 없어요.</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            {filteredBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
