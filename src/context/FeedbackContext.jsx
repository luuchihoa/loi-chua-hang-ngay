import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import FeedbackModal from '../components/feedback/FeedbackModal.jsx';

const FeedbackContext = createContext(null);

export function FeedbackProvider({ children }) {
  const [request, setRequest] = useState(null);

  const openFeedback = useCallback((preset = {}) => setRequest(preset), []);
  const closeFeedback = useCallback(() => setRequest(null), []);

  const value = useMemo(() => ({ openFeedback, closeFeedback }), [openFeedback, closeFeedback]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <FeedbackModal request={request} onClose={closeFeedback} />
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback must be used inside FeedbackProvider');
  return context;
}
