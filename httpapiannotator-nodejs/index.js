const bodyParser = require('body-parser');
const express = require('express');

const app = express();
app.use(bodyParser.json());

const getLanguageForAnnotation = (languageAnnotations, candidateAnnotation) => {
	return languageAnnotations.find(languageAnnotation => {
		const languageStartIndex = languageAnnotation.range.startIndex;
		const languageEndIndex = languageStartIndex + languageAnnotation.range.length;
		const unitStartIndex = candidateAnnotation.range.startIndex;
		const unitEndIndex = unitStartIndex + candidateAnnotation.range.length;
		return languageStartIndex <= unitStartIndex && languageEndIndex >= unitEndIndex;
	});
};

const METERS_TO_FEET_FACTOR = 0.304800610;

app.post('/api/annotate', (req, res) => {
	// Select all language annotations.
	const languageAnnotations = req.body.annotations.filter(annotation =>
		annotation.type.name === 'language' &&
		annotation.type.namespace === 'urn:fontoxml:fcq:annotations:language:1.0.0');

	// Select all unit-of-measure annotations.
	const unitsOfMeasureAnnotations = req.body.annotations.filter(annotation =>
		annotation.type.name === 'unit-of-measure' &&
		annotation.type.namespace === 'urn:fontoxml:fcq:annotations:tutorial:1.0.0');

	const unitsOfMeasureConvertAnnotations = [];
	for (const unitOfMeasureAnnotation of unitsOfMeasureAnnotations) {
		// Select the language annotation for this unit-of-measure
		const languageAnnotation = getLanguageForAnnotation(languageAnnotations, unitOfMeasureAnnotation);
		if (!languageAnnotation) {
			continue;
		}

		const metadata = unitOfMeasureAnnotation.metadata;
		if (!metadata.captures ||
			!metadata.captures.unit ||
			!metadata.captures.unit[0] ||
			metadata.captures.unit[0].value === undefined ||
			!metadata.captures.value ||
			!metadata.captures.value[0] ||
			metadata.captures.value[0].value === undefined) {
			continue;
		}

		const languageTag = languageAnnotation.metadata.tag;
		const unit = metadata.captures.unit[0].value.toLowerCase();
		const value = parseFloat(metadata.captures.value[0].value.replace(',', '.'));

		let replacement;
		if (unit === 'feet' && languageTag === 'nl') {
			replacement = `${(value * METERS_TO_FEET_FACTOR).toLocaleString('nl', { maximumFractionDigits: 2 })} meter`;
		}
		else if (unit.startsWith('meter') && languageTag === 'en') {
			replacement = `${(value / METERS_TO_FEET_FACTOR).toLocaleString('en', { maximumFractionDigits: 2 })} feet`;
		}
		else {
			continue;
		}

		unitsOfMeasureConvertAnnotations.push({
			type: {
				name: 'unit-of-measure-convert',
				namespace: 'urn:fontoxml:fcq:annotations:tutorial:1.0.0'
			},
			range: unitOfMeasureAnnotation.range,
			metadata: {
				replacement
			}
		});
	}

	res.json({
		results: unitsOfMeasureConvertAnnotations
	});
});

const port = process.env.PORT || 6005;
app.listen(port, () => {
	console.log(`Content Quality HttpApiAnnotator tutorial app listening on port ${port}!`);
});
