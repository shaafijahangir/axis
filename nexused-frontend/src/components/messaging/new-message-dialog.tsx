'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MY_CONTACTS_QUERY } from '@/lib/graphql/queries/messaging';
import { SEND_MESSAGE_MUTATION } from '@/lib/graphql/mutations/messaging';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  relationship: string;
}

interface NewMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (conversationId: string) => void;
}

export function NewMessageDialog({
  open,
  onOpenChange,
  onConversationCreated,
}: NewMessageDialogProps) {
  const [search, setSearch] = useState('');
  const [messageText, setMessageText] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const { data, loading } = useQuery<{ myContacts: Contact[] }>(
    MY_CONTACTS_QUERY,
    { skip: !open },
  );

  const [sendMessage, { loading: sending }] = useMutation<{
    sendMessage: { id: string; conversationId: string };
  }>(SEND_MESSAGE_MUTATION, {
    onCompleted: (result) => {
      onConversationCreated(result.sendMessage.conversationId);
      setSelectedContact(null);
      setMessageText('');
      setSearch('');
      onOpenChange(false);
    },
  });

  const contacts = data?.myContacts ?? [];
  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.relationship.toLowerCase().includes(q),
    );
  }, [contacts, search]);

  function handleSelectContact(contact: Contact) {
    setSelectedContact(contact);
  }

  function handleSend() {
    if (!selectedContact || !messageText.trim()) return;
    sendMessage({
      variables: {
        input: {
          recipientId: selectedContact.id,
          content: messageText.trim(),
        },
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>

        {!selectedContact ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-64">
              {loading ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  Loading contacts...
                </p>
              ) : filtered.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  No contacts found.
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  {filtered.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => handleSelectContact(contact)}
                      className="flex items-center gap-3 rounded-md p-3 text-left transition-colors hover:bg-accent"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs">
                          {contact.firstName[0]}
                          {contact.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {contact.firstName} {contact.lastName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {contact.relationship}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-md border p-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-xs">
                  {selectedContact.firstName[0]}
                  {selectedContact.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {selectedContact.firstName} {selectedContact.lastName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {selectedContact.relationship}
                </p>
              </div>
              <button
                onClick={() => setSelectedContact(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Change
              </button>
            </div>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message..."
              className="min-h-[100px] w-full resize-none rounded-md border bg-transparent p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              onClick={handleSend}
              disabled={!messageText.trim() || sending}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
