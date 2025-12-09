import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatHistorySidebar } from "./ChatHistorySidebar";
import { EventsSidebar } from "./EventsSidebar";
import { X, Send, Bot, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useChatHistory } from "@/hooks/useChatHistory";
import { useGoogleCalendar, CalendarEvent } from "@/hooks/useGoogleCalendar";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatInterfaceProps {
  onClose: () => void;
}

export function ChatInterface({ onClose }: ChatInterfaceProps) {
  const { user } = useAuth();
  const { events } = useGoogleCalendar();
  const {
    conversations,
    loading: chatHistoryLoading,
    createConversation,
    loadConversationMessages,
    addMessageToConversation,
    deleteConversation,
    togglePinConversation,
    clearCurrentConversation
  } = useChatHistory();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: `Hi ${user?.first_name || 'there'}! 👋 I'm your AI wellness coach. I've been analyzing your recent activity and I'm impressed with your consistency! How are you feeling about your progress this week?`,
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Loading messages that cycle while waiting for AI response
  const loadingMessages = useMemo(() => [
    "Analyzing your health data...",
    "Checking your recent activity...",
    "Reviewing your progress...",
    "Consulting wellness insights...",
    "Crafting a personalized response...",
    "Almost there..."
  ], []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cycle through loading messages while AI is typing
  useEffect(() => {
    if (!isTyping) {
      setLoadingMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 5000); // Change message every 2 seconds

    return () => clearInterval(interval);
  }, [isTyping, loadingMessages.length]);

  const sendChatRequest = async (userMessage: string, conversationId: string | null = null, selectedEvent: CalendarEvent | null = null) => {
    try {
      // Build payload - backend will enhance with auth tokens and forward to n8n
      const payload: any = {
        userId: user?.id,
        conversationId: conversationId,
        timestamp: new Date().toISOString(),
        action: 'chat_message',
        message: userMessage,
        source: 'chat_interface'
      };
  
      // Include selected event if available
      if (selectedEvent) {
        payload.selected_event = {
          id: selectedEvent.id,
          summary: selectedEvent.summary,
          description: selectedEvent.description,
          start: selectedEvent.start,
          end: selectedEvent.end,
          location: selectedEvent.location,
          attendees: selectedEvent.attendees
        };
        console.log('✅ Event data added to payload:', payload.selected_event.summary);
      } else {
        console.log('ℹ️ No event selected for this message');
      }
  
      // Backend will:
      // 1. Fetch auth tokens from Supabase
      // 2. Add auth object to payload
      // 3. Forward to n8n webhook (from N8N_WEBHOOK_URL env var)
  
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
  
      if (response.ok) {
        console.log('Chat request sent successfully with userId:', user?.id, selectedEvent ? '(with selected event)' : '');
        const responseJSON = await response.json();
        return responseJSON.output;
      } else {
        console.error('Chat request failed:', response.statusText);
        return null;
      }
    } catch (error) {
      console.error('Error sending chat request:', error);
      return null;
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !user) return;
  
    const userMessageContent = inputValue;
    const timestamp = new Date();
    
    // Add user message to UI immediately
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      content: userMessageContent,
      isUser: true,
      timestamp,
    };
  
    setMessages(prev => [...prev, tempUserMessage]);
    setInputValue("");
    setIsTyping(true);
  
    try {
      // Step 1: Create conversation if this is the first message (no conversation selected)
      let conversationId = selectedConversationId;
      
      if (!conversationId) {
        // Generate title from first message (first 50 chars)
        const title = userMessageContent.length > 50 
          ? userMessageContent.substring(0, 47) + '...'
          : userMessageContent;
        
        const newConversation = await createConversation(title, []);
        
        if (newConversation) {
          conversationId = newConversation.id;
          setSelectedConversationId(conversationId);
        } else {
          throw new Error('Failed to create conversation');
        }
      }
  
      // Step 2: Save user message to database
      if (conversationId) {
        await addMessageToConversation(conversationId, {
          content: userMessageContent,
          is_user: true,
          timestamp,
        });
      }

      // Look up the selected event from current events state
      const selectedEvent = selectedEventId 
        ? events.find(event => event.id === selectedEventId) || null
        : null;

      // Log warning if event was selected but not found
      if (selectedEventId && !selectedEvent) {
        console.warn('⚠️ Selected event not found in events array:', {
          selectedEventId,
          availableEventIds: events.map(e => e.id),
          eventsCount: events.length
        });
      }

      console.log('📤 Sending message with event:', {
        selectedEventId,
        selectedEvent: selectedEvent ? {
          id: selectedEvent.id,
          summary: selectedEvent.summary,
          start: selectedEvent.start,
          end: selectedEvent.end
        } : 'none',
        eventsCount: events.length
      });
  
      // Step 3: Get AI response from webhook
      const webhookResponse = await sendChatRequest(userMessageContent, conversationId, selectedEvent);
      
      let aiResponseContent = "I'm sorry, I'm having trouble processing your request right now. Please try again.";
      
      if (webhookResponse) {
        aiResponseContent = webhookResponse;
      }
      
      const aiTimestamp = new Date();
      const aiResponse: Message = {
        id: `temp-ai-${Date.now()}`,
        content: aiResponseContent,
        isUser: false,
        timestamp: aiTimestamp,
      };
  
      setMessages(prev => [...prev, aiResponse]);
  
      // Step 4: Save AI response to database
      if (conversationId) {
        await addMessageToConversation(conversationId, {
          content: aiResponseContent,
          is_user: false,
          timestamp: aiTimestamp,
        });
      }
  
    } catch (error) {
      console.error('Error processing chat message:', error);
      
      const errorResponse: Message = {
        id: `error-${Date.now()}`,
        content: "I'm experiencing technical difficulties. Please try again in a moment.",
        isUser: false,
        timestamp: new Date(),
      };
  
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewConversation = () => {
    setSelectedConversationId(null);
    clearCurrentConversation();
    setMessages([{
      id: "1",
      content: `Hi ${user?.first_name || 'there'}! 👋 I'm your AI wellness coach. How can I help you today?`,
      isUser: false,
      timestamp: new Date(),
    }]);
  };

  const handleConversationSelect = async (conversationId: string | null) => {
    setSelectedConversationId(conversationId);
    if (conversationId) {
      const conversation = await loadConversationMessages(conversationId);
      if (conversation && conversation.messages) {
        setMessages(conversation.messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          isUser: msg.is_user,
          timestamp: msg.timestamp
        })));
      }
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    await deleteConversation(conversationId);
    if (selectedConversationId === conversationId) {
      handleNewConversation();
    }
  };

  const handlePinConversation = async (conversationId: string, isPinned: boolean) => {
    await togglePinConversation(conversationId, isPinned);
  };

  const handleEventSelect = (eventId: string | null) => {
    setSelectedEventId(eventId);
    console.log('🎯 Event selected:', eventId);
  };

  // Clear selected event if it no longer exists in events array
  // Only check when selectedEventId changes, not when events array updates
  useEffect(() => {
    if (selectedEventId && events.length > 0 && !events.find(e => e.id === selectedEventId)) {
      console.warn('⚠️ Selected event no longer in events list, clearing selection');
      setSelectedEventId(null);
    }
  }, [selectedEventId]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[1600px] h-[800px] flex gap-4 animate-fade-in">
        {/* Chat History Sidebar - Left */}
        <div className="w-80 flex-shrink-0">
          <ChatHistorySidebar
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onConversationSelect={handleConversationSelect}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
            onPinConversation={handlePinConversation}
            isLoading={chatHistoryLoading}
            className="h-full"
          />
        </div>

        {/* Main Chat Interface - Center */}
        <div className="flex-1 bg-card rounded-lg border border-border p-6 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">AI Wellness Coach</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Online & ready to help
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.isUser ? "flex-row-reverse pr-2" : "flex-row"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  message.isUser 
                    ? "bg-gradient-motivation" 
                    : "bg-gradient-primary"
                )}>
                  {message.isUser ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                
                <div className={cn(
                  "max-w-[80%] rounded-lg p-3 animate-fade-in",
                  message.isUser
                    ? "bg-gradient-motivation text-white ml-auto"
                    : "bg-muted text-foreground"
                )}>
                  <div className="text-sm prose max-w-none dark:prose-invert prose-p:my-3 prose-ul:my-3 prose-li:my-1.5 prose-strong:font-semibold prose-h3:mt-4 prose-h3:mb-2 prose-h3:text-base prose-h2:mt-5 prose-h2:mb-3 leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                  <p className={cn(
                    "text-xs mt-2 opacity-70",
                    message.isUser ? "text-white/70" : "text-muted-foreground"
                  )}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-muted rounded-lg p-3 animate-fade-in">
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <p className="text-xs text-muted-foreground animate-pulse">
                      {loadingMessages[loadingMessageIndex]}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="pt-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                placeholder="Ask about your progress, schedule, or get wellness tips..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button 
                variant="wellness" 
                size="icon"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Quick suggestions */}
            <div className="flex gap-2 mt-2 flex-wrap">
              {[
                "How's my sleep affecting my workouts?",
                "Suggest a workout for today",
                "Show me this week's trends"
              ].map((suggestion, index) => (
                <Button
                  key={index}
                  variant="zen"
                  size="sm"
                  className="text-xs"
                  onClick={() => setInputValue(suggestion)}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Events Sidebar - Right */}
        <div className="w-80 flex-shrink-0">
          <EventsSidebar
            onEventSelect={handleEventSelect}
            selectedEventId={selectedEventId}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}