import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileAudio,
  FolderOpen,
  LoaderCircle,
  RefreshCw,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { checkAdminAudioObjects, uploadAdminAudio } from '../../utils/adminAudioApi.js';
import {
  AUDIO_DIRECTORY_LABELS,
  collectDroppedAudioFiles,
  makeAdminAudioItem,
  validateAdminAudioFile,
} from '../../utils/adminAudioFiles.js';
import { loadAudioIndex } from '../../utils/audioIndexService.js';

let nextItemId = 1;

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
};

const statusLabel = (item) => {
  if (item.status === 'uploading') return `Đang tải ${item.progress}%`;
  if (item.status === 'uploaded') return 'Đã tải lên';
  if (item.status === 'failed') return item.uploadError || 'Thất bại';
  if (item.status === 'checking' || item.status === 'unchecked') return 'Đang kiểm tra';
  if (item.exists) return 'Đã có trên R2';
  return 'Sẵn sàng';
};

export default function AdminAudioUploader({ session }) {
  const [items, setItems] = useState([]);
  const [defaultDirectory, setDefaultDirectory] = useState('readings');
  const [overwrite, setOverwrite] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const summary = useMemo(() => ({
    total: items.length,
    valid: items.filter((item) => !item.error).length,
    uploaded: items.filter((item) => item.status === 'uploaded').length,
    bytes: items.reduce((sum, item) => sum + item.file.size, 0),
  }), [items]);

  const checkItems = async (queue) => {
    const valid = queue.filter((item) => !item.error);
    if (!valid.length) return queue;
    const duplicateKeys = new Set(valid.filter((item, index) => valid.findIndex((other) => other.key === item.key) !== index).map((item) => item.key));
    let checked = queue.map((item) => duplicateKeys.has(item.key)
      ? { ...item, error: 'File bị lặp trong danh sách.', status: 'invalid' }
      : item);
    const pending = checked.filter((item) => !item.error);
    setItems(checked.map((item) => pending.some((entry) => entry.id === item.id) ? { ...item, status: 'checking' } : item));

    try {
      const remote = await checkAdminAudioObjects(session.access_token, pending.map((item) => item.key));
      const byKey = new Map(remote.map((object) => [object.key, object]));
      checked = checked.map((item) => {
        if (item.error) return item;
        const object = byKey.get(item.key);
        return { ...item, exists: Boolean(object?.exists), status: object?.exists ? 'exists' : 'ready' };
      });
      setMessage('');
    } catch (error) {
      checked = checked.map((item) => item.error ? item : { ...item, status: 'failed', uploadError: error.message });
      setMessage(error.message);
    }
    setItems(checked);
    return checked;
  };

  const addFiles = async (incoming) => {
    const mp3Files = incoming.filter(({ file }) => file.name.toLowerCase().endsWith('.mp3'));
    if (!mp3Files.length) {
      setMessage('Không tìm thấy file MP3 trong dữ liệu đã chọn.');
      return;
    }
    const added = mp3Files.map((entry) => makeAdminAudioItem(entry, defaultDirectory, nextItemId++));
    await checkItems([...items.filter((item) => item.status !== 'uploaded'), ...added]);
  };

  const changeDirectory = (id, directory) => {
    setItems((current) => current.map((item) => {
      if (item.id !== id) return item;
      const error = validateAdminAudioFile(item.file, directory);
      return {
        ...item,
        directory,
        key: `${directory}/${item.file.name.normalize('NFC')}`,
        error,
        exists: false,
        status: error ? 'invalid' : 'unchecked',
        uploadError: '',
      };
    }));
  };

  const uploadAll = async () => {
    const queue = items.filter((item) => !item.error && item.status !== 'uploaded' && (!item.exists || overwrite));
    if (!queue.length) {
      setMessage(overwrite ? 'Không có file hợp lệ cần tải lên.' : 'Không có file mới. Bật ghi đè nếu muốn thay file đã có.');
      return;
    }
    if (items.some((item) => item.status === 'unchecked')) {
      await checkItems(items);
      setMessage('Danh sách vừa được kiểm tra lại. Hãy bấm tải lên một lần nữa.');
      return;
    }

    setBusy(true);
    setMessage('');
    let uploadedBible = false;
    for (const queued of queue) {
      setItems((current) => current.map((item) => item.id === queued.id
        ? { ...item, status: 'uploading', progress: 0, uploadError: '' }
        : item));
      try {
        await uploadAdminAudio({
          accessToken: session.access_token,
          file: queued.file,
          key: queued.key,
          overwrite,
          onProgress: (progress) => setItems((current) => current.map((item) => item.id === queued.id
            ? { ...item, progress }
            : item)),
        });
        uploadedBible ||= queued.directory === 'bible';
        setItems((current) => current.map((item) => item.id === queued.id
          ? { ...item, status: 'uploaded', progress: 100, exists: true }
          : item));
      } catch (error) {
        setItems((current) => current.map((item) => item.id === queued.id
          ? { ...item, status: 'failed', uploadError: error.message }
          : item));
      }
    }
    if (uploadedBible) await loadAudioIndex({ force: true });
    setBusy(false);
    setMessage('Đã hoàn tất lượt đồng bộ. Các file lỗi vẫn được giữ lại để bạn thử lại.');
  };

  const onDrop = async (event) => {
    event.preventDefault();
    setDragging(false);
    await addFiles(await collectDroppedAudioFiles(event.dataTransfer));
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="text-sm font-bold text-stone-700 dark:text-stone-200">
          Thư mục mặc định cho file lẻ
          <select value={defaultDirectory} onChange={(event) => setDefaultDirectory(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 font-normal dark:border-stone-700 dark:bg-stone-800 sm:max-w-xs">
            {Object.entries(AUDIO_DIRECTORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="flex h-11 items-center gap-2 rounded-xl border border-stone-200 px-3 text-sm font-semibold dark:border-stone-700">
          <input type="checkbox" checked={overwrite} onChange={(event) => setOverwrite(event.target.checked)} />
          Cho phép ghi đè file đã có
        </label>
      </div>

      <div
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
        onDrop={onDrop}
        className={`rounded-3xl border-2 border-dashed px-5 py-10 text-center transition ${dragging ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/20' : 'border-stone-300 bg-stone-50 dark:border-stone-700 dark:bg-stone-900/60'}`}
      >
        <UploadCloud className="mx-auto text-amber-700" size={38} />
        <h2 className="mt-3 font-serif text-xl font-bold text-stone-900 dark:text-stone-100">Thả file hoặc cả thư mục audio vào đây</h2>
        <p className="mx-auto mt-1 max-w-xl text-sm text-stone-500 dark:text-stone-400">Nếu đường dẫn có bible, readings hoặc gospel, hệ thống tự chọn đúng kho. File lẻ dùng thư mục mặc định ở trên.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-10 items-center gap-2 rounded-xl bg-amber-700 px-4 text-sm font-bold text-white hover:bg-amber-800"><FileAudio size={16} />Chọn file MP3</button>
          <button type="button" onClick={() => folderInputRef.current?.click()} className="flex h-10 items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-sm font-bold dark:border-stone-700 dark:bg-stone-800"><FolderOpen size={16} />Chọn cả thư mục</button>
        </div>
        <input ref={fileInputRef} hidden type="file" accept="audio/mpeg,.mp3" multiple onChange={(event) => { addFiles([...event.target.files].map((file) => ({ file }))); event.target.value = ''; }} />
        <input ref={folderInputRef} hidden type="file" accept="audio/mpeg,.mp3" multiple webkitdirectory="" directory="" onChange={(event) => { addFiles([...event.target.files].map((file) => ({ file, relativePath: file.webkitRelativePath }))); event.target.value = ''; }} />
      </div>

      {message && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{message}</p>}

      {items.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 p-4 dark:border-stone-800">
            <p className="text-sm font-bold">{summary.total} file · {formatBytes(summary.bytes)} · {summary.uploaded} đã tải lên</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => checkItems(items)} className="flex h-9 items-center gap-2 rounded-lg border border-stone-200 px-3 text-xs font-bold disabled:opacity-50 dark:border-stone-700"><RefreshCw size={14} />Kiểm tra R2</button>
              <button type="button" disabled={busy} onClick={() => setItems([])} className="flex h-9 items-center gap-2 rounded-lg border border-stone-200 px-3 text-xs font-bold disabled:opacity-50 dark:border-stone-700"><Trash2 size={14} />Xóa danh sách</button>
            </div>
          </div>
          <div className="max-h-[32rem] divide-y divide-stone-200 overflow-y-auto dark:divide-stone-800">
            {items.map((item) => (
              <div key={item.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_10rem_10rem_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">{item.file.name}</p>
                  <p className="mt-0.5 truncate text-xs text-stone-500">{item.key} · {formatBytes(item.file.size)}</p>
                  {item.error && <p className="mt-1 text-xs font-semibold text-rose-600">{item.error}</p>}
                  {item.status === 'uploading' && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700"><div className="h-full bg-amber-700 transition-all" style={{ width: `${item.progress}%` }} /></div>}
                </div>
                <select aria-label={`Thư mục cho ${item.file.name}`} disabled={busy || item.status === 'uploaded'} value={item.directory} onChange={(event) => changeDirectory(item.id, event.target.value)} className="h-9 rounded-lg border border-stone-200 bg-white px-2 text-xs dark:border-stone-700 dark:bg-stone-800">
                  {Object.entries(AUDIO_DIRECTORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${item.error || item.status === 'failed' ? 'text-rose-600' : item.status === 'uploaded' ? 'text-emerald-600' : item.exists ? 'text-amber-700' : 'text-stone-500'}`}>
                  {item.status === 'checking' || item.status === 'uploading' ? <LoaderCircle className="animate-spin" size={14} /> : item.error || item.status === 'failed' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                  <span className="truncate">{item.error || statusLabel(item)}</span>
                </div>
                <button type="button" aria-label={`Bỏ ${item.file.name}`} disabled={busy} onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} className="justify-self-start rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-stone-800 sm:justify-self-end"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 p-4 dark:border-stone-800">
            <p className="text-xs text-stone-500">{summary.valid} file hợp lệ. File đã có chỉ được thay khi bật ghi đè.</p>
            <button type="button" disabled={busy || !summary.valid} onClick={uploadAll} className="flex h-11 items-center gap-2 rounded-xl bg-amber-700 px-5 text-sm font-bold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <LoaderCircle className="animate-spin" size={16} /> : <UploadCloud size={16} />}{busy ? 'Đang đồng bộ…' : 'Đồng bộ lên R2'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
