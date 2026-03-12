import { useUIStore } from '@/stores/uiStore';
import { ListMusic, MicVocal, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import QueuePanel from './QueuePanel';
import LyricsPanel from './LyricsPanel';

const RightPanel = () => {
  const { rightPanelOpen, rightPanelTab, setRightPanelTab, toggleRightPanel } = useUIStore();

  return (
    <AnimatePresence>
      {rightPanelOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed right-0 top-0 bottom-[90px] z-40 overflow-hidden hidden md:block"
        >
          <div className="glass h-full flex flex-col" style={{ borderRadius: 0, borderRight: 'none', borderTop: 'none', borderBottom: 'none' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <div className="flex gap-1">
                <button
                  onClick={() => setRightPanelTab('queue')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    rightPanelTab === 'queue' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ListMusic size={14} /> Queue
                </button>
                <button
                  onClick={() => setRightPanelTab('lyrics')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    rightPanelTab === 'lyrics' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <MicVocal size={14} /> Lyrics
                </button>
              </div>
              <button onClick={toggleRightPanel} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {rightPanelTab === 'queue' ? <QueuePanel /> : <LyricsPanel />}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default RightPanel;
