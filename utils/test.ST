// Define Variables
VAR
   httpRequest: HttpClient; // This is a hypothetical function block for sending HTTP requests
   responseCode: INT;
   responseData: STRING[255];
   temperature: REAL := 25.5; // Example data
   jsonData: STRING[255];
END_VAR

// Create JSON payload
jsonData := CONCAT('{ "temperature": ', REAL_TO_STRING(temperature), ' }');

// Configure HTTP Client
httpRequest.URL := 'https: // api.kwanza.io/plc-data';
httpRequest.METHOD := 'POST';
httpRequest.Payload := jsonData;

// Send HTTP Request
httpRequest.Execute();

// Check Response
IF httpRequest.Done THEN
   responseCode := httpRequest.StatusCode;
   responseData := httpRequest.Response; // This stores server response if needed
END_IF
