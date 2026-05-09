'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CourseCardProps {
  id: string;
  code: string;
  title: string;
  description?: string;
  instructor?: string;
  status?: string;
}

export function CourseCard({
  id,
  code,
  title,
  description,
  instructor,
  status,
}: CourseCardProps) {
  return (
    <Link href={`/courses/${id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{code}</Badge>
            {status && (
              <Badge variant="outline" className="capitalize">
                {status}
              </Badge>
            )}
          </div>
          <CardTitle className="mt-2 text-lg">{title}</CardTitle>
          {instructor && <CardDescription>{instructor}</CardDescription>}
        </CardHeader>
        {description && (
          <CardContent>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {description}
            </p>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
