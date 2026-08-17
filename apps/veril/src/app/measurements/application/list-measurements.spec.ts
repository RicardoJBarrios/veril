import { describe, expect, it, vi } from 'vitest';
import { aquariumIdFrom } from '../../shared/domain/aquarium-reference';
import { ActiveAquariumContext } from '../../shared/application/active-aquarium-context';
import { ActiveAquariumContextStorage } from '../../shared/application/active-aquarium-context-storage';
import { KeeperSession, MeasurementPage, MeasurementReader } from './ports';
import { ListMeasurements } from './list-measurements';

const aquariumId = aquariumIdFrom('123e4567-e89b-42d3-a456-426614174000');

function createContext(): ActiveAquariumContext {
  const storage: ActiveAquariumContextStorage = {
    load: vi.fn(),
    save: vi.fn(),
    clear: vi.fn(),
  };
  return new ActiveAquariumContext(storage);
}

function setup() {
  const reader: MeasurementReader = {
    listOwned: vi.fn(),
    getOwned: vi.fn(),
  };
  const keeperSession: KeeperSession = {
    requireAuthenticatedKeeper: vi.fn().mockResolvedValue({ id: 'keeper-a' }),
  };
  const context = createContext();
  context.select(aquariumId);

  return {
    reader,
    keeperSession,
    context,
    list: new ListMeasurements(reader, keeperSession, context),
  };
}

const emptyPage: MeasurementPage = { items: [] };

describe('ListMeasurements', () => {
  it('requires an authenticated keeper', async () => {
    const { list, keeperSession, reader } = setup();
    const failure = new Error('Authentication unavailable');
    vi.mocked(keeperSession.requireAuthenticatedKeeper).mockRejectedValue(
      failure,
    );

    await expect(list.execute()).rejects.toBe(failure);
    expect(reader.listOwned).not.toHaveBeenCalled();
  });

  it('does not query without an active Aquarium', async () => {
    const { list, context, reader } = setup();
    context.clear();

    await expect(list.execute()).rejects.toThrow(
      'Aquarium context is required',
    );
    expect(reader.listOwned).not.toHaveBeenCalled();
  });

  it('returns an empty first page', async () => {
    const { list, reader } = setup();
    vi.mocked(reader.listOwned).mockResolvedValue(emptyPage);

    await expect(list.execute()).resolves.toEqual(emptyPage);
    expect(reader.listOwned).toHaveBeenCalledWith(
      'keeper-a',
      aquariumId,
      undefined,
    );
  });

  it('passes the opaque cursor for the next page', async () => {
    const { list, reader } = setup();
    const page = {
      items: [],
      nextCursor: 'opaque-cursor' as never,
    } satisfies MeasurementPage;
    vi.mocked(reader.listOwned)
      .mockResolvedValueOnce(page)
      .mockResolvedValueOnce(emptyPage);

    await expect(list.execute()).resolves.toBe(page);
    await expect(list.execute(page.nextCursor)).resolves.toBe(emptyPage);
    expect(reader.listOwned).toHaveBeenNthCalledWith(
      2,
      'keeper-a',
      aquariumId,
      page.nextCursor,
    );
  });

  it('propagates infrastructure failures', async () => {
    const { list, reader } = setup();
    const failure = new Error('Firestore unavailable');
    vi.mocked(reader.listOwned).mockRejectedValue(failure);

    await expect(list.execute()).rejects.toBe(failure);
  });
});
