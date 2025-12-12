import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4 py-16 sm:px-6 lg:px-8">
      <Card className="w-full text-center">
        <CardHeader className="space-y-2">
          <p className="text-sm text-muted-foreground">404</p>
          <CardTitle className="text-3xl sm:text-4xl">Page not found</CardTitle>
          <CardDescription>
            The page you’re looking for doesn’t exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild>
            <Link href="/">Return home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
