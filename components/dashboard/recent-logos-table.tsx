import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { FC } from "react";

interface RecentLogosTableProps {
    logos: {
        id: string;
        fields: {
            'Account Name'?: string;
            'Description'?: string;
            'Created'?: string;
        }
    }[];
}

export const RecentLogosTable: FC<RecentLogosTableProps> = ({ logos }) => {
  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Recent Logos</CardTitle>
        <CardDescription>A list of the most recent logos created.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logos.slice(0, 5).map((logo) => (
              <TableRow key={logo.id}>
                <TableCell className="font-medium">{logo.fields['Account Name'] || 'N/A'}</TableCell>
                <TableCell>{logo.fields['Description'] || 'N/A'}</TableCell>
                <TableCell>{new Date(logo.fields['Created'] || '').toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
