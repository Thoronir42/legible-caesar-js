$(document).ready(function () {
    const AVAILABLE_CODECS = [
        {'caption': 'Full alphabet', value: 'default'},
        {'caption': 'Original article', value: 'original'},
        {'caption': 'Full minus X', value: 'nox'}
    ];

    var csSupplier = new CodesetSupplier();
    var codec = new Codec();

    var panel = new View("#wrapper-panel");
    var process;

    panel.$buttons.encode.click(function () {
        process = new EncodeProcess(codec, panel.$fields.plainText.val());
        panel.setChoices(process.getChoices());
        updateFields(process);
        panel.showControls('encode');
    });


    panel.$buttons.encodeRandom.click(function () {
        var proc = new EncodeProcess(codec, panel.$fields.plainText.val());
        // bulkSize splits process into equal* parts to allow progress bar refreshing
        var bulkSize = Math.floor(proc.wordCount / 20);
        bulkSize = bulkSize < 50 ? 50 : bulkSize;
        // use time delay between bulks == allows progress bar to be refreshed
        var timeDelay = panel.$root.find('input[name=delay-time]').prop('checked') ? 1 : 0;
        var tStart, tEnd, tTotal;


        panel.showControls('progress');
        if(timeDelay > 0){
            panel.setProgress(0);
        } else {
            panel.setProgress(100, "Encoding " + proc.wordCount +" words * " + codec.modulo + " variations");
        }

        console.log("Bulk size is " + bulkSize + " words");

        tStart = performance.now();

        // start random encoding, closure is executed afetr whole input is encoded
        randomEncode(proc, bulkSize, timeDelay, function () {
            tEnd = performance.now();

            panel.setProgress(100);
            panel.showControls('general');

            updateFields(proc);
            tTotal = Math.floor((tEnd - tStart) * 100) / 100;
            panel.alert(proc.wordCount + " words encoded, each with " + codec.modulo + " variants, in " + tTotal +" ms.", 'result', 'success');
        });

    });

    panel.$buttons.decode.click(function () {
        var keys = panel.$fields.keys.val().split(' ');
        var ciphers = panel.$fields.cipherText.val().split(' ');
        var tStart, tEnd, tTotal;

        tStart = performance.now();
        var plainWords = codec.decodeAll(ciphers, keys);
        tEnd = performance.now();

        if (typeof plainWords == "string") {
            panel.alert(plainWords, 'err', 'danger');
        } else {
            panel.$fields.plainText.val(plainWords.join(' '));

            tTotal = Math.floor((tEnd - tStart) * 100) / 100;
            panel.alert(ciphers.length + " words decoded in " + tTotal +" ms.", 'result', 'success');
        }
    });

    function randomEncode(process, bulkSize, timeDelay, onFinished) {
        console.log(process.step + " / " + process.wordCount);
        var continueEncryption;
        while (process.remainingWordCount() > 0) {
            var n = Math.floor(Math.random() * codec.modulo);
            continueEncryption = process.select(n);

            if (!continueEncryption) {
                break;
            }

            // breaks the cycle to allow progress-related logic
            if (process.step % bulkSize == 0) {
                break;
            }
        }

        if(timeDelay > 0){
            var pct = Math.floor(process.step / process.wordCount * 100);
            panel.setProgress(pct, process.step + " / " + process.wordCount);
        }

        if (continueEncryption) {
            setTimeout(function () {
                randomEncode(process, bulkSize, timeDelay, onFinished);
            }, timeDelay);
        } else {
            onFinished();
        }
    }

    // following functionality is only view-related
    panel.$buttons.reset.click(function () {
        panel.showControls('general');
    });

    panel.$fields.choices.on('click', 'span', function () {
        var $label = $(this);
        var hasNext = process.select($label.data('offset'));

        panel.setChoices(hasNext ? process.getChoices() : []);

        updateFields(process);
    });

    panel.$root.on('change', "input[name=codec]", function () {
        var name = $(this).val();
        if (name != "custom")
            setCodecByName(name);
    });

    panel.$root.find(".codec-viewer").data('content', function () {
        var codesets = codec.getCodeSets();
        var labels = [];

        var html = "<span class='text-primary'>Codec mod = " + codec.modulo + "</span><hr/>" +
            "<span class='text-muted'>Codec charsets: </span><br/>";

        for (var i in codesets) {
            labels.push("<div class='label label-info'>[" + codesets[i].length + "] " + codesets[i] + "</div>");
        }


        return html + labels.join(', ');
    });

    panel.$alerts.on('click', '.alert .close', function () {
        var name = $(this).parent().data('name');
        panel.unalert(name);
    });

    $('[data-toggle="popover"]').popover();
    panel.setCodecs(AVAILABLE_CODECS);


    setCodecByName('nox', true);

    function updateFields(process) {
        panel.updateFields(process.getInput(), process.getOutput(), process.getKeys());
    }

    function setCodecByName(name, updatePanel) {
        csSupplier.get(name, function (codesets) {
            var result = codec.setCharsets(codesets);
            if (typeof result == "string") {
                console.error(result);
            }
        }, function (errorMessage) {
            console.error("Codec supplier failerd with: " + errorMessage);
        });
        if (updatePanel === true) {
            panel.selectCodec(name);
        }
    }
});


