import { useGoogleCalendar, CalendarEvent } from "@/hooks/useGoogleCalendar";
import { useGoogleCalendarOAuth } from "@/hooks/useGoogleCalendarOAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  RefreshCw, 
  Clock, 
  MapPin,
  Users,
  AlertCircle,
  Check
} from "lucide-react";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { cn } from "@/lib/utils";

interface EventsSidebarProps {
  onEventSelect: (eventId: string | null) => void;
  selectedEventId: string | null;
  className?: string;
}

export function EventsSidebar({ onEventSelect, selectedEventId, className }: EventsSidebarProps) {
  const { initiateOAuth, isLoading: oauthLoading } = useGoogleCalendarOAuth();
  const { 
    isAuthenticated, 
    events, 
    isLoading, 
    error, 
    signOut, 
    refreshEvents 
  } = useGoogleCalendar();

  const handleConnect = async () => {
    await initiateOAuth();
  };
  
  const handleEventClick = (eventId: string) => {
    const newSelectedId = eventId === selectedEventId ? null : eventId;
    onEventSelect(newSelectedId);
  };

  const formatEventTime = (event: CalendarEvent) => {
    if (event.start.dateTime) {
      const startDate = parseISO(event.start.dateTime);
      const endDate = parseISO(event.end.dateTime!);
      
      let datePrefix = "";
      if (isToday(startDate)) {
        datePrefix = "Today ";
      } else if (isTomorrow(startDate)) {
        datePrefix = "Tomorrow ";
      } else {
        datePrefix = format(startDate, "MMM d ");
      }
      
      return `${datePrefix}${format(startDate, "h:mm a")} - ${format(endDate, "h:mm a")}`;
    } else if (event.start.date) {
      const date = parseISO(event.start.date);
      if (isToday(date)) {
        return "Today (All day)";
      } else if (isTomorrow(date)) {
        return "Tomorrow (All day)";
      } else {
        return `${format(date, "MMM d")} (All day)`;
      }
    }
    return "No time specified";
  };

  const getEventTypeColor = (summary: string) => {
    const lowerSummary = summary.toLowerCase();
    if (lowerSummary.includes('workout') || lowerSummary.includes('gym') || lowerSummary.includes('exercise')) {
      return "bg-primary/10 text-primary";
    } else if (lowerSummary.includes('meeting') || lowerSummary.includes('call')) {
      return "bg-blue-100 text-blue-700";
    } else if (lowerSummary.includes('yoga') || lowerSummary.includes('meditation')) {
      return "bg-green-100 text-green-700";
    }
    return "bg-muted text-muted-foreground";
  };

  // Show connect screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className={cn("bg-muted/30 rounded-lg p-4 text-center", className)}>
        <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-3">
          <Calendar className="w-6 h-6 text-white" />
        </div>
        <h3 className="font-semibold mb-2 text-sm">Calendar Events</h3>
        <p className="text-muted-foreground mb-3 text-xs">
          Connect to manage your events
        </p>
        {error && (
          <div className="flex items-center justify-center gap-2 text-red-600 mb-3">
            <AlertCircle className="w-3 h-3" />
            <span className="text-xs">{error}</span>
          </div>
        )}
        <Button 
          variant="wellness" 
          size="sm"
          onClick={handleConnect}
          disabled={oauthLoading}
          className="text-xs"
        >
          {oauthLoading ? "Connecting..." : "Connect Calendar"}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("bg-card rounded-lg border border-border", className)}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Calendar Events</h3>
          <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
            Connected
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={refreshEvents}
            disabled={isLoading}
            className="h-7 px-2"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={signOut}
            className="h-7 px-2 text-xs"
          >
            Disconnect
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 m-4 p-2 bg-red-50 rounded-lg">
          <AlertCircle className="w-3 h-3" />
          <span className="text-xs">{error}</span>
        </div>
      )}

      <div className="max-h-96 overflow-y-auto">
        {isLoading && events.length === 0 ? (
          <div className="text-center py-6">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground text-xs">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground text-xs">No upcoming events</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {events.map((event) => (
              <div key={event.id} className="relative">
                <div 
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
                    selectedEventId === event.id 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-border bg-card hover:border-primary/50"
                  )}
                  onClick={() => handleEventClick(event.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-xs truncate">{event.summary}</h4>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getEventTypeColor(event.summary)}`}
                        >
                          {event.summary.toLowerCase().includes('workout') ? 'Workout' : 
                           event.summary.toLowerCase().includes('meeting') ? 'Meeting' : 
                           event.summary.toLowerCase().includes('yoga') ? 'Wellness' : 'Event'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span className="truncate">{formatEventTime(event)}</span>
                        </div>
                      </div>
                      
                      {event.location && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                      
                      {event.attendees && event.attendees.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Users className="w-3 h-3" />
                          <span>{event.attendees.length} attendees</span>
                        </div>
                      )}
                    </div>
                    
                    {selectedEventId === event.id && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
