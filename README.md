# speech-app-server
Basic Express server for real-time translation

שפות נתמכות ל- STT לפי הקישור להלן של Deepgram מודל nova-3:

https://developers.deepgram.com/docs/models-languages-overview

שפות נתמכות ל- Translate לפי הקישור להלן של Azure:

https://learn.microsoft.com/en-us/azure/ai-services/translator/language-support

שפות נתמכות ל- TTS לפי הקישור להלן של Google:

https://cloud.google.com/text-to-speech/docs/list-voices-and-types#list_of_all_supported_languages

בשביל לשנות שפה:

בקובץ deepgram.js:

יש לשנות את ה- sourceLang לשפה המדוברת ע"י המשתמש (בהתאם לשפות הנתמכות ע"י Deepgram).

יש לשנות את ה- targetLang לשפה שברצוננו לתרגם. - לא חייב לשנות ערך זה פה. במקום זאת, ניתן לשנות בקובץ azure-translator.js.


בקובץ azure-translator.js:

יש לשנות את ה- from לשפה בה המשתמש מדבר (צריך להיות תואם ל- sourceLang מהקובץ deepgram.js).

יש לשנות את ה- to לשפה אלייה נרצה לתרגם. לדוגמה: "he" או אם יש מס' שפות "he,ru" (בהתאם לשפות הנתמכות ע"י Azure).


בקובץ google-tts.js:

יש לשנות את ה- languageCode לשפה ש-TTS ידבר (צריך להיות תואם ל- to מהקובץ azure-translator.js, אבל רק לשפה אחת) (בהתאם לשפות הנתמכות ע"י Google).

יש לשנות את ה- gender למגדר הנכון.

יש לשנות את ה- voiceName לקול המתאים לשפה:

Israel

עבור he-IL לזכר	he-IL-Wavenet-D 

עבור he-IL לנקבה he-IL-Wavenet-C

Australia

עבור en-AU לזכר en-AU-Chirp3-HD-Schedar

עבור en-AU לנקבה en-AU-Chirp3-HD-Sulafat

UK

עבור en-GB לזכר en-GB-Chirp3-HD-Schedar

עבור en-GB לנקבה en-GB-Chirp3-HD-Sulafat

US

עבור en-US לזכר en-US-Chirp3-HD-Schedar

עבור en-US לנקבה en-US-Chirp3-HD-Sulafat

Spain

עבור es-ES לזכר es-ES-Chirp3-HD-Schedar

עבור es-ES לנקבה es-ES-Chirp3-HD-Sulafat

US

עבור es-US לזכר es-US-Chirp3-HD-Schedar

עבור es-US לנקבה es-US-Chirp3-HD-Sulafat

France

עבור fr-FR לזכר fr-FR-Chirp3-HD-Schedar

עבור fr-FR לנקבה fr-FR-Chirp3-HD-Sulafat

Germany

עבור de-DE לזכר de-DE-Chirp3-HD-Schedar

עבור de-DE לנקבה de-DE-Chirp3-HD-Sulafat

India

עבור hi-IN לזכר hi-IN-Chirp3-HD-Schedar

עבור hi-IN לנקבה hi-IN-Chirp3-HD-Sulafat

Russia

עבור ru-RU לזכר	ru-RU-Chirp3-HD-Charon

עבור ru-RU לנקבה ru-RU-Chirp3-HD-Aoede

Brazil

עבור pt-BR לזכר pt-BR-Chirp3-HD-Schedar

עבור pt-BR לנקבה pt-BR-Chirp3-HD-Sulafat

Portugal

עבור pt-PT לזכר pt-PT-Wavenet-F

עבור pt-PT לנקבה pt-PT-Wavenet-E

Japan

עבור ja-JP לזכר ja-JP-Chirp3-HD-Schedar

עבור ja-JP לנקבה ja-JP-Chirp3-HD-Sulafat

Italy

עבור it-IT לזכר it-IT-Chirp3-HD-Schedar

עבור it-IT לנקבה it-IT-Chirp3-HD-Sulafat

Netherlands

עבור nl-NL לזכר nl-NL-Chirp3-HD-Schedar

עבור nl-NL לנקבה 	nl-NL-Chirp3-HD-Sulafat

Belgium

עבור nl-BE לזכר nl-BE-Chirp3-HD-Schedar

עבור nl-BE לנקבה nl-BE-Chirp3-HD-Sulafat


