import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30 },
  section: { marginBottom: 10 },
});

export default function AdminReportPDF({ data }: { data: any }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text>MSME Bazaar Admin Report</Text>
        <View style={styles.section}>
          <Text>Stats:</Text>
          <Text>{JSON.stringify(data)}</Text>
        </View>
      </Page>
    </Document>
  );
}
