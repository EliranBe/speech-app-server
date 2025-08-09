const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const fetch = require("cross-fetch");
const dotenv = require("dotenv");
dotenv.config();

const url = "http://stream.live.vc.bbcmedia.co.uk/bbc_world_service";

const live = async () => {
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

  const connection = deepgram.listen.live({
    model: "nova-3",
    language: "en-US",
    smart_format: true,
  });

  connection.on(LiveTranscriptionEvents.Open, () => {
    connection.on(LiveTranscriptionEvents.Close, () => {
      console.log("Connection closed.");
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      console.log(data.channel.alternatives[0].transcript);
    });

    connection.on(LiveTranscriptionEvents.Metadata, (data) => {
      console.log(data);
    });

    connection.on(LiveTranscriptionEvents.Error, (err) => {
      console.error(err);
    });

    fetch(url)
      .then((r) => r.body)
      .then((res) => {
        res.on("readable", () => {
          connection.send(res.read());
        });
      });
  });
};

live();
