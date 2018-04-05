using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace FontoXml.ContentQuality.HttpApiAnnotator.Sample
{
	/// <summary>
	/// Program
	/// </summary>
	public class Program
	{
		public static IWebHost BuildWebHost(string[] args) =>
			WebHost.CreateDefaultBuilder(args)
				.UseStartup<Startup>()
				.UseKestrel(options => { options.Listen(IPAddress.Any, 6005); })
				.Build();

		public static void Main(string[] args) => BuildWebHost(args).Run();
	}

	/// <summary>
	/// Startup
	/// </summary>
	public class Startup
	{
		public void Configure(IApplicationBuilder app, IHostingEnvironment env) => app.UseMvc();
		public void ConfigureServices(IServiceCollection services) => services.AddMvc();
	}

	/// <summary>
	/// Request
	/// </summary>
	[JsonObject]
	public sealed class RequestDto
	{
		[JsonProperty("annotations", Required = Required.Always)]
		public List<AnnotationDto> Annotations { get; set; }

		[JsonProperty("text", Required = Required.Always)]
		public string Text { get; set; }
	}

	/// <summary>
	/// Response
	/// </summary>
	[JsonObject]
	public sealed class ResponseDto
	{
		[JsonProperty("results", Required = Required.Always)]
		public List<AnnotationDto> Annotations { get; set; } = new List<AnnotationDto>();
	}

	/// <summary>
	/// Annotation
	/// </summary>
	public class AnnotationDto
	{
		[JsonProperty("metadata", Required = Required.Default)]
		public JObject Metadata { get; set; }

		[JsonProperty("range", Required = Required.Always)]
		public AnnotationRangeDto Range { get; set; }

		[JsonProperty("type", Required = Required.Always)]
		public AnnotationTypeDto Type { get; set; }

		[JsonObject]
		public class AnnotationTypeDto
		{
			[JsonProperty("name", Required = Required.Always)]
			public string Name { get; set; }

			[JsonProperty("namespace", Required = Required.Always)]
			public string Namespace { get; set; }
		}

		[JsonObject]
		public class AnnotationRangeDto
		{
			[JsonProperty("length", Required = Required.Always)]
			public int Length;

			[JsonProperty("startIndex", Required = Required.Always)]
			public int StartIndex;
		}
	}

	/// <summary>
	/// Controller
	/// </summary>
	[Route("api/annotate")]
	public class AnnotateController : Controller
	{
		[HttpPost]
		[Produces("application/json")]
		public ResponseDto Annotate([FromBody] RequestDto request)
		{
			// Select all language annotations.
			var languageAnnotations = request
				.Annotations
				.Where(a => a.Type.Name.Equals("language") && a.Type.Namespace.Equals("urn:fontoxml:fcq:annotations:language:1.0.0"))
				.ToList();

			// Select all unit-of-measure annotations.
			var unitsOfMeasure = request.Annotations
				.Where(a => a.Type.Name.Equals("unit-of-measure") && a.Type.Namespace.Equals("urn:fontoxml:fcq:annotations:tutorial:1.0.0"));

			var regexMatcher = new Regex(@"^([-+]?[0-9]*[\.\,]?[0-9]+(e[-+]?[0-9]+)?)\s+(feet|meter|meters)$", RegexOptions.IgnoreCase);

			var response = new ResponseDto();
			foreach (var unitOfMeasure in unitsOfMeasure)
			{
				// Select the language annotation for this unit-of-measure
				var language = languageAnnotations.Single(lang => IsAnnotationWithinLanguage(unitOfMeasure, lang));

				// Skip this unit-of-measure because we do not know the language of that part of the content.
				if (language == null)
					continue;

				var regexMatches = regexMatcher.Match(unitOfMeasure.Metadata["match"].Value<string>());
				if (!regexMatches.Success)
					continue;

				var languageTag = language.Metadata["tag"].Value<string>();
				var unit = regexMatches.Groups[3].Value.ToLower();
				var value = double.Parse(regexMatches.Groups[1].Value.Replace(',', '.'), new CultureInfo("en-US"));

				string replacement;
				const double metersToFeetFactor = 0.304800610;
				if (unit.Equals("feet") && languageTag.Equals("nl"))
				{
					var meters = value * metersToFeetFactor;
					replacement = $"{Math.Round(meters, 2).ToString(new CultureInfo(languageTag))} meter";
				}
				else if (unit.Equals("meter") && languageTag.Equals("en"))
				{
					var feet = value / metersToFeetFactor;
					replacement = $"{Math.Round(feet, 2).ToString(new CultureInfo(languageTag))} feet";
				}
				else
					continue;

				response.Annotations.Add(new AnnotationDto
				{
					Type = new AnnotationDto.AnnotationTypeDto
					{
						Name = "unit-of-measure-convert",
						Namespace = "urn:fontoxml:fcq:annotations:tutorial:1.0.0"
					},
					Range = unitOfMeasure.Range,
					Metadata = new JObject
					{
						{ "replacement", replacement }
					}
				});
			}

			return response;
		}

		/// <summary>
		/// Helper
		/// </summary>
		private static bool IsAnnotationWithinLanguage(AnnotationDto candidate, AnnotationDto language)
		{
			var languageStartIndex = language.Range.StartIndex;
			var languageEndIndex = languageStartIndex + language.Range.Length;

			var unitStartIndex = candidate.Range.StartIndex;
			var unitEndIndex = unitStartIndex + candidate.Range.Length;
			return languageStartIndex <= unitStartIndex && languageEndIndex >= unitEndIndex;
		}
	}
}
